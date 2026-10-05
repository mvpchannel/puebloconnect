import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { requireAdmin } from "@/lib/require-admin";
import { limitMember } from "@/lib/rate-limit";
import { readImageChange } from "@/lib/entity-image";
import { getGroupBySlug, setGroupCover } from "@/lib/db";

// POST /api/groups/:slug/image — { imageDataUrl } or { remove: true }.
// The group's creator (or an admin) only.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const limited = limitMember(session.sub, "upload");
  if (limited) return limited as NextResponse;

  const group = getGroupBySlug(params.slug);
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  if (group.creator_id !== session.sub && !requireAdmin(req)) {
    return NextResponse.json({ error: "Only the group's creator can change its picture." }, { status: 403 });
  }

  const change = await readImageChange(req, "groups");
  if ("error" in change) return change.error;
  setGroupCover(group.id, change.path);
  return NextResponse.json({ path: change.path });
}
