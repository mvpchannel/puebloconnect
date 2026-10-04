import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getGroupBySlug, getGroupMemberRole, parseTags } from "@/lib/db";

// GET /api/groups/:slug — a single group's detail, plus whether the
// requesting viewer is a member (false/null when logged out).
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const group = getGroupBySlug(params.slug);
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });

  const session = requireUser(req);
  const role = session ? getGroupMemberRole(group.id, session.sub) : null;

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      tags: parseTags(group.tags),
      coverPhotoPath: group.cover_photo_path,
      creatorId: group.creator_id,
      creatorUsername: group.creator_username,
      memberCount: group.member_count,
      postCount: group.post_count,
      createdAt: group.created_at,
    },
    isMember: Boolean(role),
    role,
  });
}
