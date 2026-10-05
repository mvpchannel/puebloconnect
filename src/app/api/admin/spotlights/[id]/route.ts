import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { updateSpotlight, softDeleteSpotlight, getSpotlightById } from "@/lib/db";
import { parseSpotlightBody } from "@/lib/spotlight-input";

function idOf(param: string): number | null {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PUT /api/admin/spotlights/:id — edit (and publish/unpublish) a spotlight.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const id = idOf(params.id);
  if (!id || !getSpotlightById(id)) return NextResponse.json({ error: "Spotlight not found." }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = parseSpotlightBody(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const row = updateSpotlight(id, parsed.input);
  return NextResponse.json({ spotlight: { id, slug: row?.slug, status: row?.status } });
}

// DELETE /api/admin/spotlights/:id — remove a spotlight (soft delete).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const id = idOf(params.id);
  if (!id || !getSpotlightById(id)) return NextResponse.json({ error: "Spotlight not found." }, { status: 404 });
  softDeleteSpotlight(id);
  return NextResponse.json({ ok: true });
}
