import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { enableStorefront, disableStorefront } from "@/lib/db";

// PUT /api/admin/storefronts/:businessId — { enabled: boolean, color?: "#rrggbb" }
// Gives a business a building in the 3D Pueblo (or recolors / removes it). Admin only.
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
  if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "Missing enabled flag." }, { status: 400 });
  if (!body.enabled) {
    disableStorefront(id);
    return NextResponse.json({ ok: true });
  }
  const color = typeof body.color === "string" ? body.color : "#c7794b";
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return NextResponse.json({ error: "Choose a valid color." }, { status: 400 });
  const result = enableStorefront(id, color.toLowerCase());
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.error.includes("not found") ? 404 : 409 });
  return NextResponse.json({ ok: true, lot: result.lot });
}
