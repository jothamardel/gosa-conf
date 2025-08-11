import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Wasender } from "./wasender-api";
import { put } from "@vercel/blob";
import QRCode from "qrcode";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
// export async function generateQrCode(data = []) {
//   // console.log({ data, url: process.env.GOSA_PUBLIC_URL });
//   if (!data) return [];

//   // Process all items in parallel
//   const promises = data.map(async (item: { paymentReference: string }) => {
//     try {
//       // Promisify QRCode.toBuffer
//       const buffer = await new Promise<Buffer>((resolve, reject) => {
//         QRCode.toBuffer(
//           `${process.env.GOSA_PUBLIC_URL}?ref=${item?.paymentReference}`,
//           {
//             type: "png",
//             // @ts-ignore
//             quality: 0.92,
//             margin: 1,
//             color: {
//               dark: "#000000",
//               light: "#FFFFFF",
//             },
//             width: 512,
//           },
//           (error: Error | null | undefined, buffer: Buffer) => {
//             if (error) {
//               reject(error);
//             } else {
//               resolve(buffer);
//             }
//           },
//         );
//       });

//       console.log({
//         buffer,
//         data,
//         phoneNumber: normalizePhoneNumber(
//           item?.paymentReference?.split("_")[1],
//         ),
//       });

//       // Upload the QR code image
//       const blob = await put(`${item?.paymentReference}.png`, buffer, {
//         access: "public",
//         addRandomSuffix: true,
//       });

//       console.log({ blob });

//       // Send the WhatsApp message
//       const res = await Wasender.httpSenderMessage({
//         to: convertToInternationalFormat(
//           `${normalizePhoneNumber(item?.paymentReference?.split("_")[1] || "+2347033680280")}`,
//         ),
//         text: `Hi there, here is your ticket.\nThis is your access to the convention.\nThank you.\nGOSA convention 2025 committee.`,
//         imageUrl: blob?.url,
//       });

//       console.log({ res });

//       return {
//         success: true,
//         item: item.paymentReference,
//         result: res,
//         ...res,
//       };
//     } catch (error: any) {
//       console.error(`Error processing item ${item?.paymentReference}:`, error);
//       return {
//         success: false,
//         item: item.paymentReference,
//         error: error.message,
//       };
//     }
//   });

//   // Wait for all operations to complete
//   const results = await Promise.allSettled(promises);

//   // Log results
//   results.forEach((result, index) => {
//     if (result.status === "fulfilled") {
//       console.log(`Item ${index + 1} processed successfully:`, result.value);
//     } else {
//       console.error(`Item ${index + 1} failed:`, result.reason);
//     }
//   });

//   return results;
// }

export async function generateQrCode(data = []) {
  if (!data) return [];

  // Helper function to delay execution
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Helper function to retry operations
  async function retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
  ): Promise<T> {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          const waitTime = delayMs * attempt; // Exponential backoff
          console.log(`Waiting ${waitTime}ms before retry...`);
          await delay(waitTime);
        }
      }
    }

    throw lastError;
  }

  // Process items with controlled concurrency and rate limiting
  const processItem = async (
    item: { paymentReference: string },
    index: number,
  ) => {
    try {
      // Add staggered delay to prevent rate limiting (500ms between each request)
      await delay(index * 500);

      console.log(
        `Processing item ${index + 1}/${data.length}: ${item.paymentReference}`,
      );

      // Generate QR Code with retry
      const buffer = await retryOperation(
        async () => {
          return new Promise<Buffer>((resolve, reject) => {
            QRCode.toBuffer(
              `${process.env.GOSA_PUBLIC_URL}?ref=${item?.paymentReference}`,
              {
                type: "png",
                // @ts-ignore
                quality: 0.92,
                margin: 1,
                color: {
                  dark: "#000000",
                  light: "#FFFFFF",
                },
                width: 512,
              },
              (error: Error | null | undefined, buffer: Buffer) => {
                if (error) {
                  reject(error);
                } else {
                  resolve(buffer);
                }
              },
            );
          });
        },
        3,
        1000,
      );

      console.log(`QR code generated for ${item.paymentReference}`);

      // Upload the QR code image with retry
      const blob = await retryOperation(
        async () => {
          return await put(`${item?.paymentReference}_${index}.png`, buffer, {
            access: "public",
            addRandomSuffix: true,
          });
        },
        3,
        2000,
      );

      console.log(`QR code uploaded for ${item.paymentReference}:`, blob?.url);

      const phoneNumber = normalizePhoneNumber(
        item?.paymentReference?.split("_")[1],
      );

      // Send WhatsApp message with retry and longer delays
      const res = await retryOperation(
        async () => {
          return await Wasender.httpSenderMessage({
            to: convertToInternationalFormat(phoneNumber),
            text: `Hi there, here is your ticket #${index + 1}.\nThis is your access to the convention.\nThank you.\nGOSA convention 2025 committee.`,
            imageUrl: blob?.url,
          });
        },
        5,
        3000,
      ); // More retries and longer delays for WhatsApp API

      console.log(`WhatsApp message sent successfully to ${phoneNumber}:`, res);

      return {
        success: true,
        item: item.paymentReference,
        phoneNumber,
        result: res,
        ...res,
      };
    } catch (error: any) {
      console.error(`Error processing item ${item?.paymentReference}:`, error);
      return {
        success: false,
        item: item.paymentReference,
        error: error.message,
        stack: error.stack,
      };
    }
  };

  // Process items in smaller batches to avoid overwhelming the system
  const BATCH_SIZE = 3; // Process 3 items at a time
  const results: any[] = [];

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch: any = data.slice(i, i + BATCH_SIZE);
    console.log(
      `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(data.length / BATCH_SIZE)}`,
    );

    const batchPromises = batch.map((item: any, batchIndex: any) =>
      processItem(item, i + batchIndex),
    );

    const batchResults = await Promise.allSettled(batchPromises);

    // Extract results from settled promises
    const processedResults = batchResults.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        console.error(`Batch item ${i + index + 1} failed:`, result.reason);
        return {
          success: false,
          item: batch[index]?.paymentReference,
          error: result.reason?.message || "Unknown error",
        };
      }
    });

    results.push(...processedResults);

    // Add delay between batches
    if (i + BATCH_SIZE < data.length) {
      console.log("Waiting 2 seconds before processing next batch...");
      await delay(2000);
    }
  }

  // Summary logging
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n=== Processing Complete ===`);
  console.log(`Total items: ${data.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log("\nFailed items:");
    results
      .filter((r) => !r.success)
      .forEach((result, index) => {
        console.log(`${index + 1}. ${result.item}: ${result.error}`);
      });
  }

  return results;
}

function convertToInternationalFormat(phoneNumber: string) {
  console.log("Convert To International Format: ", phoneNumber);
  // Remove any spaces, dashes, or other non-digit characters
  const cleanNumber = phoneNumber.replace(/\D/g, "");

  // Check if the number is already in international format
  if (cleanNumber.startsWith("234") && cleanNumber.length === 13) {
    console.log("1: ", `+${cleanNumber}`)
    return "+" + cleanNumber;
  }

  // Check if it's a local Nigerian number starting with 0
  if (cleanNumber.startsWith("0") && cleanNumber.length === 11) {
    // Remove the leading 0 and add Nigeria country code
    console.log("2: ", `+234${cleanNumber.substring(1)}`)
    return "+234" + cleanNumber.substring(1);
  }

  // Check if it's a Nigerian number without the leading 0
  if (cleanNumber.length === 10 && /^[789]/.test(cleanNumber)) {
    console.log("3: ", `+234${cleanNumber}`)
    return "+234" + cleanNumber;
  }

  // If none of the above conditions match, return an error
  throw new Error("Invalid Nigerian phone number format");
}

function normalizePhoneNumber(phoneNumber: string) {
  const cleanNumber = phoneNumber.replace(/\D/g, "");

  if (cleanNumber.startsWith("234") && cleanNumber.length === 13) {
    return "+" + cleanNumber;
  }

  if (cleanNumber.startsWith("0") && cleanNumber.length === 11) {
    return "+234" + cleanNumber.substring(1);
  }

  if (cleanNumber.length === 10 && /^[789]/.test(cleanNumber)) {
    return "+234" + cleanNumber;
  }

  throw new Error("Invalid Nigerian phone number format");

}

// Note: Only export client-safe utilities here
// Server-side utilities should be imported directly from their specific files
