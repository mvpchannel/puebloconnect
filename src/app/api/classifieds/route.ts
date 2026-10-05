import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { createClassified } from "@/lib/db";
import { isClassifiedCategory } from "@/lib/classified-categories";
import { saveDataUrlImage } from "@/lib/save-image";
import { checkAndRecordRateLimit } from "@/lib/rate-limit";

// POST /api/classifieds — post a listing. Login required; limited to 5
// listings per member per day to blunt spam. Photo optional.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const priceText = typeof body.priceText === "string" ? body.priceText.trim() : "";

  if (!isClassifiedCategory(body.category)) {
    return NextResponse.json({ error: "Choose a category." }, { status: 400 });
  }
  if (!title || title.length > 100) {
    return NextResponse.json({ error: "Title is required (100 characters max)." }, { status: 400 });
  }
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "Description is required (2000 characters max)." }, { status: 400 });
  }
  if (priceText.length > 30) {
    return NextResponse.json({ error: "Price is too long (30 characters max)." }, { status: 400 });
  }

  let imagePath: string | null = null;
  if (typeof body.imageDataUrl === "string" && body.imageDataUrl.length > 0) {
    const saved = saveDataUrlImage(body.imageDataUrl, "classifieds");
    if (typeof saved !== "string") {
      return NextResponse.json({ error: `Photo: ${saved.error}` }, { status: 400 });
    }
    imagePath = saved;
  }

  const limit = checkAndRecordRateLimit(`classified:${session.sub}`, { max: 5, windowSeconds: 24 * 60 * 60 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "You've reached today's limit of 5 listings. Try again tomorrow." }, { status: 429 });
  }

  const row = createClassified(session.sub, body.category, title, text, priceText || null, imagePath);
  return NextResponse.json({ classified: { id: row.id } }, { status: 201 });
}
