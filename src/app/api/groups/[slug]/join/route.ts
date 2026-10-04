import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getGroupBySlug, joinGroup } from "@/lib/db";

// POST /api/groups/:slug/join — join a group. Requires login. Idempotent:
// joining a group you're already in just confirms membership (see
// joinGroup in db.ts).
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const group = getGroupBySlug(params.slug);
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });

  joinGroup(group.id, session.sub);
  return NextResponse.json({ joined: true });
}
