import { NextRequest, NextResponse } from "next/server";
import { saveDataUrlImage } from "@/lib/save-image";

// Shared body handling for the owner-only "set/remove picture" endpoints.
// Body: { imageDataUrl: "data:image/...;base64,..." } to set, or
// { remove: true } to clear. Returns the new public path (or null when
// removed), or a ready error response. Image bytes are verified by
// save-image (PNG/JPEG/WEBP signature, 3MB cap).
export async function readImageChange(
  req: NextRequest,
  subdir: string
): Promise<{ path: string | null } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid request body." }, { status: 400 }) };
  }
  const { imageDataUrl, remove } = (body ?? {}) as Record<string, unknown>;
  if (remove === true) return { path: null };
  if (typeof imageDataUrl !== "string" || imageDataUrl.length === 0) {
    return { error: NextResponse.json({ error: "An image is required." }, { status: 400 }) };
  }
  const saved = saveDataUrlImage(imageDataUrl, subdir);
  if (typeof saved !== "string") {
    return { error: NextResponse.json({ error: saved.error }, { status: 400 }) };
  }
  return { path: saved };
}
