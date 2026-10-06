import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { setContactMessageStatus } from "@/lib/db";

const ALLOWED = ["new", "read", "replied", "closed"] as const;

// POST /api/admin/contact-messages/:id  { status } — mark a message (admin only).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const id = Number(params.id);
  let body: { status?: unknown } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const status = ALLOWED.find((s) => s === body.status);
  if (!Number.isInteger(id) || !status) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!setContactMessageStatus(id, status)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true, status });
}
