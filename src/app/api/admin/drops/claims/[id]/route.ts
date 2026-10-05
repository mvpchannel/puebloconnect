import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { setDropClaimRedeemed } from "@/lib/db";

// PUT /api/admin/drops/claims/:id — { redeemed: boolean } marks a member's prize as handed over.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.redeemed !== "boolean") return NextResponse.json({ error: "Missing redeemed flag." }, { status: 400 });
  if (!setDropClaimRedeemed(Number(params.id), body.redeemed)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
