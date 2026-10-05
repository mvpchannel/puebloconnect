import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { setBusinessTour, clearBusinessTour } from "@/lib/db";
import { parseTourUrl } from "@/lib/tour-url";

// PUT /api/admin/tours/:businessId — { url } attaches a virtual tour (YouTube, Vimeo or Matterport). DELETE removes it.
export async function PUT(req: NextRequest, { params }: { params: { businessId: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const id = Number(params.businessId);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid business." }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = parseTourUrl(body.url);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const url = (body.url as string).trim().slice(0, 500);
  if (!setBusinessTour(id, url, parsed.provider, parsed.embedSrc)) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, provider: parsed.provider });
}

export async function DELETE(req: NextRequest, { params }: { params: { businessId: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const id = Number(params.businessId);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid business." }, { status: 400 });
  clearBusinessTour(id);
  return NextResponse.json({ ok: true });
}
