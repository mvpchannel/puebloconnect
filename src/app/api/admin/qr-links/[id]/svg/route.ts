import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getQrLinkById } from "@/lib/db";
import { qrSvg } from "@/lib/qr";
import { qrLinkUrl } from "@/lib/qr-links";

// GET /api/admin/qr-links/:id/svg — the QR code as a downloadable, print-ready SVG (admin only).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const link = getQrLinkById(Number(params.id));
  if (!link) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new Response(qrSvg(qrLinkUrl(link.code), 1024), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `attachment; filename="pueblo-qr-${link.code}.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
