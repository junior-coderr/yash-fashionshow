import { NextResponse } from "next/server";
import { uploadToAzure } from "@/lib/azureStorage";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type;
    const fileName = file.name;

    // Upload to Azure Blob Storage
    const blobUrl = await uploadToAzure(buffer, contentType, fileName);

    return NextResponse.json({
      success: true,
      url: blobUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        message: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
