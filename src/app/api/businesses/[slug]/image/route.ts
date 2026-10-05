import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { requireAdmin } from "@/lib/require-admin";
import { limitMember } from "@/lib/rate-limit";
import { readImageChange } from "@/lib/entity-image";
import { getBusinessBySlug, isBusinessOwner, setBusinessImage } from "@/lib/db";

// POST /api/businesses/:slug/image — { kind: "logo" | "cover", imageDataUrl } or
// { kind, remove: true }. Owner of the channel (or an admin) only.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const limited = limitMember(session.sub, "upload");
  if (limited) return limited as NextResponse;

  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  if (!isBusinessOwner(business.id, session.sub) && !requireAdmin(req)) {
    return NextResponse.json({ error: "Only this channel's owner can change its pictures." }, { status: 403 });
  }

  const raw = await req.clone().json().catch(() => ({}));
  const kind = (raw as { kind?: unknown }).kind;
  if (kind !== "logo" && kind !== "cover") {
    return NextResponse.json({ error: "kind must be 'logo' or 'cover'." }, { status: 400 });
  }
  const change = await readImageChange(req, "businesses");
  if ("error" in change) return change.error;
  setBusinessImage(business.id, kind, change.path);
  return NextResponse.json({ path: change.path });
}
