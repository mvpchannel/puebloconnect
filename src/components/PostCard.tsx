"use client";

import { useEffect, useState } from "react";

type PostCardProps = {
  postId: number;
  authorName: string;
  authorImage: string;
  publishedLabel: string;
  text: string;
  initialLikeCount?: number;
  initialLiked?: boolean;
  initialCommentCount?: number;
  isLoggedIn: boolean;
};

type Comment = {
  id: number;
  authorName: string;
  authorProfilePhotoPath: string | null;
  body: string;
};

// One feed post, backed for real by /api/posts/:id/like and
// /api/posts/:id/comments (src/app/api/posts/[id]/*), which in turn read
// and write the posts/post_likes/post_comments tables in src/lib/db.ts.
// Likes and comments persist — a page refresh keeps them, unlike the
// earlier client-only placeholder.
export default function PostCard({
  postId,
  authorName,
  authorImage,
  publishedLabel,
  text,
  initialLikeCount = 0,
  initialLiked = false,
  initialCommentCount = 0,
  isLoggedIn,
}: PostCardProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likeBusy, setLikeBusy] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comments are loaded lazily on mount rather than passed down from the
  // server — keeps the initial newsfeed page fetch to one query per post
  // (the comment_count) instead of N+1 full comment lists for posts
  // nobody expands.
  useEffect(() => {
    let cancelled = false;
    if (commentCount === 0) {
      setCommentsLoaded(true);
      return;
    }
    fetch(`/api/posts/${postId}/comments`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setComments(
          (data.comments || []).map((c: { id: number; authorName: string; authorProfilePhotoPath: string | null; body: string }) => ({
            id: c.id,
            authorName: c.authorName,
            authorProfilePhotoPath: c.authorProfilePhotoPath,
            body: c.body,
          }))
        );
        setCommentsLoaded(true);
      })
      .catch(() => setCommentsLoaded(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function toggleLike() {
    if (!isLoggedIn) {
      setError("Log in to like posts.");
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);
    setError(null);
    // Optimistic update, corrected from the server response below.
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setLiked(wasLiked);
        setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
        setError(data.error || "Couldn't update that like.");
        return;
      }
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
      setError("Couldn't reach the server.");
    } finally {
      setLikeBusy(false);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      setError("Log in to comment.");
      return;
    }
    const trimmed = commentText.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't post that comment.");
        return;
      }
      setComments((prev) => [
        ...prev,
        {
          id: data.comment.id,
          authorName: data.comment.authorName,
          authorProfilePhotoPath: data.comment.authorProfilePhotoPath,
          body: data.comment.body,
        },
      ]);
      setCommentCount((c) => c + 1);
      setCommentText("");
    } catch {
      setError("Couldn't reach the server.");
    }
  }

  return (
    <div className="central-meta item">
      <div className="user-post">
        <div className="friend-info">
          <figure>
            <img src={authorImage} alt="" />
          </figure>
          <div className="friend-name">
            <ins><a href="#" title="">{authorName}</a></ins>
            <span>published: {publishedLabel}</span>
          </div>
          <div className="post-meta">
            <div className="description">
              <p>{text}</p>
            </div>
            {error && (
              <div style={{ color: "#c0392b", fontSize: "13px", margin: "4px 0" }}>{error}</div>
            )}
            <div className="we-video-info">
              <ul>
                <li>
                  <span
                    className="like"
                    data-toggle="tooltip"
                    title="Like"
                    role="button"
                    tabIndex={0}
                    onClick={toggleLike}
                    style={{ cursor: "pointer" }}
                  >
                    <i className={liked ? "fa fa-heart" : "ti-heart"} />
                    <ins>{likeCount}</ins>
                  </span>
                </li>
                <li>
                  <span className="comment" data-toggle="tooltip" title="Comments">
                    <i className="fa fa-comments-o" />
                    <ins>{commentCount}</ins>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="coment-area">
          <ul className="we-comet">
            {!commentsLoaded && commentCount > 0 && (
              <li className="post-comment">
                <div className="post-comt-box">
                  <p style={{ color: "#999" }}>Loading comments…</p>
                </div>
              </li>
            )}
            {comments.map((c) => (
              <li className="post-comment" key={c.id}>
                <div className="comet-avatar">
                  <img src={c.authorProfilePhotoPath || "/images/resources/admin.jpg"} alt="" />
                </div>
                <div className="post-comt-box">
                  <h5>{c.authorName}</h5>
                  <p>{c.body}</p>
                </div>
              </li>
            ))}
            <li className="post-comment">
              <div className="comet-avatar">
                <img src="/images/resources/admin.jpg" alt="" />
              </div>
              <div className="post-comt-box">
                <form method="post" onSubmit={submitComment}>
                  <textarea
                    placeholder={
                      isLoggedIn ? "Post your comment (press Enter to post)" : "Log in to comment"
                    }
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitComment(e);
                      }
                    }}
                  />
                </form>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
