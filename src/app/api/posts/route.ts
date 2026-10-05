import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { limitMember } from "@/lib/rate-limit";
import { createPost, listPosts, TargetType } from "@/lib/db";
import { saveDataUrlImage } from "@/lib/save-image";
import { saveUploadedVideo } from "@/lib/save-video";

const VALID_TARGET_TYPES: TargetType[] = ["feed", "group", "business", "event"];
const MAX_POST_LENGTH = 5000;

// GET /api/posts?targetType=feed&targetId= — list posts for the newsfeed
// (default) or, later, a group/business/event wall. Viewing the feed
// doesn't require being logged in; `likedByViewer` is just false for an
// anonymous viewer.
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  const { searchParams } = new URL(req.url);

  const targetTypeParam = searchParams.get("targetType") ?? "feed";
  if (!VALID_TARGET_TYPES.includes(targetTypeParam as TargetType)) {
    return NextResponse.json({ error: "Invalid targetType." }, { status: 400 });
  }
  const targetType = targetTypeParam as TargetType;

  const targetIdParam = searchParams.get("targetId");
  const targetId = targetIdParam ? Number(targetIdParam) : null;
  if (targetIdParam && (!Number.isInteger(targetId) || targetId! <= 0)) {
    return NextResponse.json({ error: "Invalid targetId." }, { status: 400 });
  }

  const posts = listPosts(session?.sub ?? null, targetType, targetId);
  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      authorId: p.author_id,
      authorUsername: p.author_username,
      authorName:
        [p.author_first_name, p.author_last_name].filter(Boolean).join(" ") ||
        p.author_username,
      authorProfilePhotoPath: p.author_profile_photo_path,
      body: p.body,
      imagePath: p.image_path,
      videoPath: p.video_path,
      targetType: p.target_type,
      targetId: p.target_id,
      createdAt: p.created_at,
      likeCount: p.like_count,
      commentCount: p.comment_count,
      likedByViewer: Boolean(p.liked_by_viewer),
    })),
  });
}

// POST /api/posts — create a post. Requires login (no anonymous
// posting); body is the only required field. targetType/targetId default
// to the general newsfeed.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const limited = limitMember(session.sub, "post");
  if (limited) return limited as NextResponse;

  // Text/photo posts arrive as JSON; a post with a video arrives as
  // multipart form data (a 50MB file can't ride inside JSON).
  let text: unknown, targetType: unknown, targetId: unknown, imageDataUrl: unknown;
  let videoFile: File | null = null;
  const isMultipart = (req.headers.get("content-type") ?? "").includes("multipart/form-data");
  try {
    if (isMultipart) {
      const form = await req.formData();
      text = form.get("body") ?? "";
      const t = form.get("targetType");
      targetType = t === null || t === "" ? undefined : t;
      const id = form.get("targetId");
      targetId = id === null || id === "" ? undefined : Number(id);
      const v = form.get("video");
      if (v instanceof File && v.size > 0) videoFile = v;
    } else {
      ({ body: text, targetType, targetId, imageDataUrl } = ((await req.json()) ?? {}) as Record<string, unknown>);
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const hasImage = typeof imageDataUrl === "string" && imageDataUrl.length > 0;
  // A post needs words, a photo or video, or both.
  if (typeof text !== "string" || (text.trim().length === 0 && !hasImage && !videoFile)) {
    return NextResponse.json({ error: "Write something or add a photo or video." }, { status: 400 });
  }
  if (hasImage && videoFile) {
    return NextResponse.json({ error: "Add a photo or a video, not both." }, { status: 400 });
  }
  if (text.length > MAX_POST_LENGTH) {
    return NextResponse.json(
      { error: `Post text must be ${MAX_POST_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  let resolvedTargetType: TargetType = "feed";
  if (targetType !== undefined) {
    if (typeof targetType !== "string" || !VALID_TARGET_TYPES.includes(targetType as TargetType)) {
      return NextResponse.json({ error: "Invalid targetType." }, { status: 400 });
    }
    resolvedTargetType = targetType as TargetType;
  }

  let resolvedTargetId: number | null = null;
  if (targetId !== undefined && targetId !== null) {
    if (typeof targetId !== "number" || !Number.isInteger(targetId) || targetId <= 0) {
      return NextResponse.json({ error: "Invalid targetId." }, { status: 400 });
    }
    resolvedTargetId = targetId;
  }

  let imagePath: string | null = null;
  if (hasImage) {
    const saved = saveDataUrlImage(imageDataUrl as string, "posts");
    if (typeof saved !== "string") {
      return NextResponse.json({ error: `Photo: ${saved.error}` }, { status: 400 });
    }
    imagePath = saved;
  }

  let videoPath: string | null = null;
  if (videoFile) {
    const saved = await saveUploadedVideo(videoFile, "posts");
    if (typeof saved !== "string") {
      return NextResponse.json({ error: `Video: ${saved.error}` }, { status: 400 });
    }
    videoPath = saved;
  }

  const post = createPost(session.sub, text.trim(), resolvedTargetType, resolvedTargetId, imagePath, videoPath);
  return NextResponse.json(
    {
      post: {
        id: post.id,
        authorId: post.author_id,
        authorUsername: post.author_username,
        authorName:
          [post.author_first_name, post.author_last_name].filter(Boolean).join(" ") ||
          post.author_username,
        authorProfilePhotoPath: post.author_profile_photo_path,
        body: post.body,
        imagePath: post.image_path,
        videoPath: post.video_path,
        targetType: post.target_type,
        targetId: post.target_id,
        createdAt: post.created_at,
        likeCount: post.like_count,
        commentCount: post.comment_count,
        likedByViewer: Boolean(post.liked_by_viewer),
      },
    },
    { status: 201 }
  );
}
