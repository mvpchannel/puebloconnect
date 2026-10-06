import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { deleteAnnouncement } from "@/lib/db";

// DELETE /api/admin/notifications/:batch — take an announcement back from every member (admin only).
export async function DELETE(req: NextRequest, { params }: { params: { batch: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const batch = Number(params.batch);
  if (!Number.isInteger(batch) || batch <= 0) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const removed = deleteAnnouncement(batch);
  if (removed === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true, removed });
}
