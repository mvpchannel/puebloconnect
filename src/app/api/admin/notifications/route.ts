import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAnnouncement } from "@/lib/db";

const MAX_LENGTH = 300;

// POST /api/admin/notifications  { message } — send an announcement to every active member (admin only).
export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  let body: { message?: unknown } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Write the message to send." }, { status: 400 });
  if (message.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Keep it to ${MAX_LENGTH} characters or fewer.` }, { status: 400 });
  }
  const sentTo = createAnnouncement(message);
  return NextResponse.json({ ok: true, sentTo }, { status: 201 });
}
