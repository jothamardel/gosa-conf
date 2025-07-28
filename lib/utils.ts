import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Wasender } from "./wasender-api";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import QRCode from "qrcode";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function generateQrCode(data = []) {
  data?.forEach(async (item: { paymentReference: string }) => {
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
      async (error: Error | null | undefined, buffer: Buffer) => {
        console.log({
          error,
          buffer,
          data,
          phoneNumber: normalizePhoneNumber(
            item?.paymentReference?.split("_")[1],
          ),
        });
        const blob = await put(`${item?.paymentReference}.png`, buffer, {
          access: "public",
          addRandomSuffix: true,
        });

        const res = await Wasender.httpSenderMessage({
          to: convertToInternationalFormat(
            `${normalizePhoneNumber(item?.paymentReference?.split("_")[1] || "+2347033680280")}`,
          ),
          text: `Hi there, here is your ticket.\nThis is your access to the convention.\nThank you.\nGOSA convention 2025 committee.`,
          imageUrl: blob?.url,
        });
      },
    );
  });
}

function convertToInternationalFormat(phoneNumber: string) {
  console.log("Convert To International Format: ", phoneNumber);
  // Remove any spaces, dashes, or other non-digit characters
  const cleanNumber = phoneNumber.replace(/\D/g, "");

  // Check if the number is already in international format
  if (cleanNumber.startsWith("234") && cleanNumber.length === 13) {
    return "+" + cleanNumber;
  }

  // Check if it's a local Nigerian number starting with 0
  if (cleanNumber.startsWith("0") && cleanNumber.length === 11) {
    // Remove the leading 0 and add Nigeria country code
    return "+234" + cleanNumber.substring(1);
  }

  // Check if it's a Nigerian number without the leading 0
  if (cleanNumber.length === 10 && /^[789]/.test(cleanNumber)) {
    return "+234" + cleanNumber;
  }

  // If none of the above conditions match, return an error
  throw new Error("Invalid Nigerian phone number format");
}

function normalizePhoneNumber(phoneNumber: string) {
  // Remove any non-digit characters
  const cleanNumber = phoneNumber.replace(/\D/g, "");

  // Check if it's a valid Nigerian number format (11 digits starting with 0)
  if (cleanNumber.length === 11 && cleanNumber.startsWith("0")) {
    // Replace the second digit with '7'
    return cleanNumber.charAt(0) + "7" + cleanNumber.substring(2);
  }

  // Check if it's a 10-digit number (without leading 0)
  if (cleanNumber.length === 10 && /^[789]/.test(cleanNumber)) {
    // Add leading 0 and replace second digit with '7'
    return "07" + cleanNumber.substring(1);
  }

  // If it doesn't match expected formats, return as is or throw error
  return cleanNumber;
}
