import { Wasender } from "@/lib/wasender-api";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import QRCode from "qrcode";
import {Agent} from "@/lib/agent"


export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log( body?.data?.messages?.message?.conversation )
    const message = body?.data?.messages?.message?.conversation
    const response = await Agent.httpSendMessage(message);
    
    console.log({ response })
    
    await Wasender.httpSenderMessage({
      to: body?.data?.messages?.key?.remoteJid,
      text: response?.response as string || response as string
    })
    
    
   
    return NextResponse.json({
      message: "Webhook Whatsapp",
      success: true,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Whatsapp api hook running...",
    success: true,
  });
}



// const body = await req.json();

// const qrCodeBuffer = QRCode.toBuffer(
//   "https://cdn.pixabay.com/photo/2023/02/28/01/50/qr-code-7819652_1280.jpg",
//   {
//     type: "png",
//     // @ts-ignore
//     quality: 0.92,
//     margin: 1,
//     color: {
//       dark: "#000000",
//       light: "#FFFFFF",
//     },
//     width: 512,
//   },
//   async (error: Error | null | undefined, buffer: Buffer) => {
//     console.log({
//       error,
//       buffer,
//     });
//     const blob = await put("qrcode.jpg", buffer, {
//       access: "public",
//       addRandomSuffix: true,
//     });

//     const res = await Wasender.httpSenderMessage({
//       to: "+2347033680280",
//       text: "Check this image",
//       imageUrl: blob?.url,
//     });

//     return NextResponse.json({
//       message: "Whatsapp",
//       success: true,
//       buffer,
//       res,
//       blob,
//     });
//   },
// );