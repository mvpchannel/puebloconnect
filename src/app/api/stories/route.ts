import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { createStory } from "@/lib/db";
import { saveDataUrlImage } from "@/lib/save-image";

// POST /api/stories — add a 24-hour photo story. Body: { imageDataUrl, caption? }.
// Requires login; the photo goes through the same PNG/JPEG/WEBP + 3MB checks
// as every other upload.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.imageDataUrl !== "string" || body.imageDataUrl.length === 0) {
    return NextResponse.json({ error: "A story needs a photo." }, { status: 400 });
  }
  const caption = typeof body.caption === "string" ? body.caption.trim().slice(0, 200) : "";

  const saved = saveDataUrlImage(body.imageDataUrl, "stories");
  if (typeof saved !== "string") {
    return NextResponse.json({ error: `Photo: ${saved.error}` }, { status: 400 });
  }

  const story = createStory(session.sub, saved, caption || null);
  return NextResponse.json({ story: { id: story.id, imagePath: story.image_path } }, { status: 201 });
}
