import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getGroupBySlug, leaveGroup } from "@/lib/db";

// POST /api/groups/:slug/leave — leave a group. Requires login. The
// group's owner can't leave their own group (see leaveGroup in db.ts) —
// returns 400 in that case rather than silently doing nothing.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const group = getGroupBySlug(params.slug);
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });

  const left = leaveGroup(group.id, session.sub);
  if (!left) {
    return NextResponse.json(
      { error: "The group owner can't leave their own group." },
      { status: 400 }
    );
  }
  return NextResponse.json({ left: true });
}
