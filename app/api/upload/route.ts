import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { badRequest, readJson } from "@/lib/http";

const ALLOWED_CONTENT_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

export async function POST(request: Request): Promise<NextResponse> {
  const body = await readJson<HandleUploadBody>(request);
  if (!body) return badRequest("invalid body");

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // No-op: DB row is created by the client after all files upload.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
