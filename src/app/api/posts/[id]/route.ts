import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getPostById, softDeletePost } from "@/lib/db";

// DELETE /api/posts/:id — real moderation + self-service deletion. A
// post's own author can delete their own post; an admin can delete any
// post (newsfeed, group, business, or event wall — all share this same
// table/route). This is a soft delete (posts.deleted_at) — db.ts already
// filters every post-listing query on deleted_at IS NULL, so a deleted
// post disappears everywhere immediately without losing the row (likes/
// comments/history stay intact for auditing, just no longer shown).
export async function DELETE(
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
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const isOwner = post.author_id === session.sub;
  const isAdmin = session.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "You can't delete someone else's post." }, { status: 403 });
  }

  softDeletePost(postId);
  return NextResponse.json({ ok: true });
}
