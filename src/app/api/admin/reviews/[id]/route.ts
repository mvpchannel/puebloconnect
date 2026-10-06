import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { deleteBusinessReviewById } from "@/lib/db";

// DELETE /api/admin/reviews/:id — remove one review (admin only).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!deleteBusinessReviewById(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
