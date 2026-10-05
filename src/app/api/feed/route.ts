import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { listFeedPosts, listPosts, listPostsByAuthor, TargetType } from "@/lib/db";

const PAGE_SIZE = 30;

// GET /api/feed?cursor=<createdAt>|<id> — the next page of the global
// newsfeed (older than the cursor). Optional scope, for the other post
// lists: ?authorId=N (a profile wall) or ?targetType=group|business|event
// &targetId=N (that page's wall). Returns `nextCursor` (null when there is
// nothing older). Same visibility as the newsfeed page itself.
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  const cursor = new URL(req.url).searchParams.get("cursor");

  let before: { createdAt: string; id: number } | null = null;
  if (cursor) {
    const [createdAt, idStr] = cursor.split("|");
    const id = Number(idStr);
    if (!createdAt || !Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid cursor." }, { status: 400 });
    }
    before = { createdAt, id };
  }

  const params = new URL(req.url).searchParams;
  const viewer = session?.sub ?? null;
  const authorIdParam = params.get("authorId");
  const targetTypeParam = params.get("targetType");
  let rows: ReturnType<typeof listFeedPosts>;
  if (authorIdParam) {
    const authorId = Number(authorIdParam);
    if (!Number.isInteger(authorId) || authorId <= 0) {
      return NextResponse.json({ error: "Invalid authorId." }, { status: 400 });
    }
    rows = listPostsByAuthor(viewer, authorId, PAGE_SIZE + 1, before) as typeof rows;
  } else if (targetTypeParam) {
    const targetId = Number(params.get("targetId"));
    if (!["group", "business", "event"].includes(targetTypeParam) || !Number.isInteger(targetId) || targetId <= 0) {
      return NextResponse.json({ error: "Invalid scope." }, { status: 400 });
    }
    rows = listPosts(viewer, targetTypeParam as TargetType, targetId, PAGE_SIZE + 1, before) as typeof rows;
  } else {
    rows = listFeedPosts(viewer, PAGE_SIZE + 1, before);
  }
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);
  const last = page[page.length - 1];

  return NextResponse.json({
    posts: page.map((p) => ({
      id: p.id,
      authorId: p.author_id,
      authorName:
        [p.author_first_name, p.author_last_name].filter(Boolean).join(" ") || p.author_username,
      authorProfilePhotoPath: p.author_profile_photo_path,
      body: p.body,
      imagePath: p.image_path,
      videoPath: p.video_path,
      createdAt: p.created_at,
      likeCount: p.like_count,
      commentCount: p.comment_count,
      likedByViewer: Boolean(p.liked_by_viewer),
      postedInLabel: p.posted_in_label ?? null,
      postedInHref: p.posted_in_href ?? null,
    })),
    nextCursor: hasMore && last ? `${last.created_at}|${last.id}` : null,
  });
}
