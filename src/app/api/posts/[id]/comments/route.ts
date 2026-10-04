import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getPostById, addComment, listCommentsForPost, createNotification } from "@/lib/db";

const MAX_COMMENT_LENGTH = 2000;

function shapeComment(c: {
  id: number;
  post_id: number;
  author_id: number;
  author_username: string;
  author_first_name: string | null;
  author_last_name: string | null;
  author_profile_photo_path: string | null;
  body: string;
  created_at: string;
}) {
  return {
    id: c.id,
    postId: c.post_id,
    authorId: c.author_id,
    authorUsername: c.author_username,
    authorName: [c.author_first_name, c.author_last_name].filter(Boolean).join(" ") || c.author_username,
    authorProfilePhotoPath: c.author_profile_photo_path,
    body: c.body,
    createdAt: c.created_at,
  };
}

// GET /api/posts/:id/comments — list comments on a post, oldest first.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const postId = Number(params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: "Invalid post id." }, { status: 400 });
  }

  const post = getPostById(postId, null);
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const comments = listCommentsForPost(postId);
  return NextResponse.json({ comments: comments.map(shapeComment) });
}

// POST /api/posts/:id/comments — add a comment. Requires login.
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { body: text } = (body ?? {}) as Record<string, unknown>;
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Comment text is required." }, { status: 400 });
  }
  if (text.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const comment = addComment(postId, session.sub, text.trim());
  createNotification(post.author_id, session.sub, "post_comment", "post", postId);
  return NextResponse.json({ comment: shapeComment(comment) }, { status: 201 });
}
