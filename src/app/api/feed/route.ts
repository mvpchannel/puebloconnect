import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { listFeedPosts } from "@/lib/db";

const PAGE_SIZE = 30;

// GET /api/feed?cursor=<createdAt>|<id> — the next page of the global
// newsfeed (older than the cursor). Returns `nextCursor` (null when there is
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

  const rows = listFeedPosts(session?.sub ?? null, PAGE_SIZE + 1, before);
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
      postedInLabel: p.posted_in_label,
      postedInHref: p.posted_in_href,
    })),
    nextCursor: hasMore && last ? `${last.created_at}|${last.id}` : null,
  });
}
