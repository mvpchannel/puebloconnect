import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { limitMember } from "@/lib/rate-limit";
import { fetchLinkMeta } from "@/lib/link-preview-server";

// Admin-only: read a page's title, description and picture so the Share a
// Link form can show the card before posting.
export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const limited = limitMember(Number(admin.sub), "adminLinkPreview");
  if (limited) return limited;
  let body: { url?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request." }, { status: 400 }); }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url || url.length > 2000) return NextResponse.json({ error: "Enter a web address." }, { status: 400 });
  const meta = await fetchLinkMeta(url);
  if ("error" in meta) return NextResponse.json({ error: meta.error }, { status: 422 });
  return NextResponse.json({ preview: meta });
}
