import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createQrLink } from "@/lib/db";
import { parseQrTarget, qrLinkUrl } from "@/lib/qr-links";
import { QR_MAX_BYTES } from "@/lib/qr";

// POST /api/admin/qr-links — create a tracked QR link (admin only).
export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label || label.length > 120) return NextResponse.json({ error: "Enter a label (up to 120 characters)." }, { status: 400 });
  const target = parseQrTarget(body.targetPath);
  if ("error" in target) return NextResponse.json({ error: target.error }, { status: 400 });
  if (new TextEncoder().encode(qrLinkUrl("xxxxxxx")).length > QR_MAX_BYTES) {
    return NextResponse.json({ error: "The site address is too long to fit in a QR code." }, { status: 400 });
  }
  const row = createQrLink(label, target.path, admin.sub ?? null);
  return NextResponse.json({ link: { id: row.id, code: row.code } }, { status: 201 });
}
