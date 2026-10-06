"use client";

import { useEffect, useState } from "react";
import Linkified from "@/components/Linkified";
import Link from "next/link";
import LinkPreviewCard from "@/components/LinkPreviewCard";
import type { LinkPreview } from "@/lib/link-meta";

type PostCardProps = {
  postId: number;
  authorId: number;
  authorName: string;
  authorImage: string;
  publishedLabel: string;
  text: string;
  imageSrc?: string | null;
  videoSrc?: string | null;
  link?: LinkPreview | null;
  initialLikeCount?: number;
  initialLiked?: boolean;
  initialCommentCount?: number;
  isLoggedIn: boolean;
  // Who's viewing — used only to decide whether the delete control shows.
  // The DELETE route re-checks ownership/admin itself server-side, so this
  // is a UI convenience, not the actual authorization boundary.
  currentUserId?: number | null;
  isAdmin?: boolean;
  // Where the post was made, when not the plain feed (group/business/event).
  postedIn?: { label: string; href: string } | null;
  // The viewer's own avatar, shown beside the comment box.
  viewerAvatar?: string;
};

type Comment = {
  id: number;
  authorId: number;
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
  authorId,
  authorName,
  authorImage,
  publishedLabel,
  text,
  imageSrc = null,
  videoSrc = null,
  link = null,
  initialLikeCount = 0,
  initialLiked = false,
  initialCommentCount = 0,
  isLoggedIn,
  currentUserId = null,
  isAdmin = false,
  postedIn = null,
  viewerAvatar = "/images/defaults/default-avatar-male.jpg",
}: PostCardProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likeBusy, setLikeBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDelete = isLoggedIn && (currentUserId === authorId || isAdmin);

  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deletePost() {
    if (!confirm("Delete this post? This can't be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't delete that post.");
        return;
      }
      setDeleted(true);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setDeleting(false);
    }
  }

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
          (data.comments || []).map((c: { id: number; authorId: number; authorName: string; authorProfilePhotoPath: string | null; body: string }) => ({
            id: c.id,
            authorId: c.authorId,
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
          authorId: data.comment.authorId,
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

  if (deleted) return null;

  return (
    <div className="central-meta item" style={{ position: "relative" }}>
      <div className="user-post">
        <div className="friend-info">
          <figure>
            <img src={authorImage} alt="" />
          </figure>
          <div className="friend-name">
            <ins><Link href={`/profile/${authorId}`} title="">{authorName}</Link></ins>
            <span>
              published: {publishedLabel}
              {postedIn && (
                <>
                  {" "}· in <Link href={postedIn.href} title="">{postedIn.label}</Link>
                </>
              )}
            </span>
          </div>
          {canDelete && (
            <div style={{ position: "absolute", top: 14, right: 14, zIndex: 1 }}>
              <button
                type="button"
                onClick={deletePost}
                disabled={deleting}
                title="Delete post"
                style={{
                  background: "none",
                  border: "none",
                  color: "#bbb",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                <i className="fa fa-trash-o" />
              </button>
            </div>
          )}
          <div className="post-meta">
            <div className="description">
              {text && <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}><Linkified text={text} /></p>}
              {link && <LinkPreviewCard link={link} />}
              {videoSrc && (
                <video
                  src={videoSrc}
                  controls
                  playsInline
                  preload="metadata"
                  style={{ width: "100%", maxHeight: 560, background: "#000", borderRadius: 6, marginTop: 8 }}
                />
              )}
              {imageSrc && (
                <img
                  src={imageSrc}
                  alt=""
                  style={{ width: "100%", maxHeight: 560, objectFit: "cover", borderRadius: 6, marginTop: 8 }}
                />
              )}
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
                  <img src={c.authorProfilePhotoPath || "/images/defaults/default-avatar-male.jpg"} alt="" />
                </div>
                <div className="post-comt-box">
                  <h5><Link href={`/profile/${c.authorId}`} title="">{c.authorName}</Link></h5>
                  <p>{c.body}</p>
                </div>
              </li>
            ))}
            <li className="post-comment">
              <div className="comet-avatar">
                <img src={viewerAvatar} alt="" />
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
