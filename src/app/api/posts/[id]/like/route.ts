import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getPostById, togglePostLike } from "@/lib/db";

// POST /api/posts/:id/like — toggle the requesting user's like on a post.
// Idempotent per click thanks to the UNIQUE(post_id, user_id) constraint
// in db.ts; a double-submit can't double-count.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const postId = Number(params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: "Invalid post id." }, { status: 400 });
  }

  const post = getPostById(postId, session.sub);
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const result = togglePostLike(postId, session.sub);
  return NextResponse.json(result);
}
