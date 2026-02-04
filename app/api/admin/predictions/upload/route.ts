import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { processImageToPredictions } from "@/lib/ocr";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(`predictions/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    // Convert to base64 for OCR
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Process with OCR
    const extracted = await processImageToPredictions(base64);

    // Return preview data (don't save to DB yet)
    return NextResponse.json({
      success: true,
      preview: {
        blobUrl: blob.url,
        participantName: extracted.participantName,
        rawText: extracted.rawText,
        matches: extracted.predictions,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
