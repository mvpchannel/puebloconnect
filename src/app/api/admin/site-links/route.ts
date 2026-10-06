import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { setSiteSetting } from "@/lib/db";
import { SOCIAL_NETWORKS, cleanSocialUrl } from "@/lib/social-links";

// PUT /api/admin/site-links  { links: { social_facebook: "https://…", … } } — save the footer's
// social media addresses (admin only). A blank value removes that link. Nothing is saved
// unless every address is valid.
export async function PUT(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  let body: { links?: Record<string, unknown> } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body.links ?? {};
  const cleaned: [string, string][] = [];
  for (const n of SOCIAL_NETWORKS) {
    const raw = input[n.key];
    if (raw === undefined) continue;
    if (typeof raw !== "string") return NextResponse.json({ error: `${n.label}: invalid value.` }, { status: 400 });
    const url = cleanSocialUrl(n, raw);
    if (url === null) {
      return NextResponse.json({ error: `${n.label}: enter a ${n.hosts[0]} address, like ${n.example}.` }, { status: 400 });
    }
    cleaned.push([n.key, url]);
  }
  for (const [key, url] of cleaned) setSiteSetting(key, url);
  return NextResponse.json({ ok: true });
}
