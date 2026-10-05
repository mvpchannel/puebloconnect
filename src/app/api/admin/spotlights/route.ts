import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createSpotlight } from "@/lib/db";
import { parseSpotlightBody } from "@/lib/spotlight-input";

// POST /api/admin/spotlights — write a new Business Spotlight (admin only).
export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = parseSpotlightBody(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const row = createSpotlight(parsed.input);
  return NextResponse.json({ spotlight: { id: row.id, slug: row.slug, status: row.status } }, { status: 201 });
}
