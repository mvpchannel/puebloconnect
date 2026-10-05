import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getQrLinkById, softDeleteQrLink } from "@/lib/db";

// DELETE /api/admin/qr-links/:id — retire a link. Printed codes for it will then show "no longer active".
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const id = Number(params.id);
  if (!Number.isInteger(id) || !getQrLinkById(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  softDeleteQrLink(id);
  return NextResponse.json({ ok: true });
}
