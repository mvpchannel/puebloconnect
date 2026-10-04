import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { createGroup, listGroups, parseTags, GroupWithMeta } from "@/lib/db";

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

function shapeGroup(g: GroupWithMeta) {
  return {
    id: g.id,
    name: g.name,
    slug: g.slug,
    description: g.description,
    tags: parseTags(g.tags),
    coverPhotoPath: g.cover_photo_path,
    creatorId: g.creator_id,
    creatorUsername: g.creator_username,
    memberCount: g.member_count,
    postCount: g.post_count,
    createdAt: g.created_at,
  };
}

// GET /api/groups — browse all groups, newest first.
export async function GET() {
  const groups = listGroups();
  return NextResponse.json({ groups: groups.map(shapeGroup) });
}

// POST /api/groups — create a group. Requires login; the creator becomes
// the group's owner automatically (see createGroup in db.ts).
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, description, tags } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Group name is required." }, { status: 400 });
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Group name must be ${MAX_NAME_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  let resolvedDescription: string | null = null;
  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      return NextResponse.json({ error: "Invalid description." }, { status: 400 });
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
    resolvedDescription = description.trim() || null;
  }

  let resolvedTags: string[] = [];
  if (tags !== undefined && tags !== null) {
    if (!Array.isArray(tags) || !tags.every((t) => typeof t === "string")) {
      return NextResponse.json({ error: "Invalid tags." }, { status: 400 });
    }
    if (tags.length > MAX_TAGS) {
      return NextResponse.json({ error: `A group can have at most ${MAX_TAGS} tags.` }, { status: 400 });
    }
    if (tags.some((t) => t.length > MAX_TAG_LENGTH)) {
      return NextResponse.json(
        { error: `Each tag must be ${MAX_TAG_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
    resolvedTags = tags as string[];
  }

  const group = createGroup(session.sub, name.trim(), resolvedDescription, resolvedTags);
  return NextResponse.json({ group: shapeGroup(group) }, { status: 201 });
}
