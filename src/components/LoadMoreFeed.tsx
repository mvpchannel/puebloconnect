"use client";

import { useState } from "react";
import PostCard from "@/components/PostCard";
import type { LinkPreview } from "@/lib/link-meta";
import { formatRelativeTime } from "@/lib/time";

type FeedPostJson = {
  id: number;
  authorId: number;
  authorName: string;
  authorProfilePhotoPath: string | null;
  body: string;
  imagePath: string | null;
  videoPath: string | null;
  link?: LinkPreview | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
  postedInLabel: string | null;
  postedInHref: string | null;
};

type Props = {
  initialCursor: string | null;
  isLoggedIn: boolean;
  currentUserId: number | null;
  isAdmin: boolean;
  viewerAvatar: string;
  // Extra query string for a scoped list, e.g. "authorId=5" or
  // "targetType=group&targetId=2". Omit for the global newsfeed.
  scope?: string;
};

// Appends older newsfeed pages below the server-rendered first page,
// via GET /api/feed (keyset-paginated — see listFeedPosts in db.ts).
export default function LoadMoreFeed({ initialCursor, isLoggedIn, currentUserId, isAdmin, viewerAvatar, scope }: Props) {
  const [cursor, setCursor] = useState(initialCursor);
  const [posts, setPosts] = useState<FeedPostJson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}${scope ? `&${scope}` : ""}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't load more posts.");
        return;
      }
      setPosts((prev) => [...prev, ...(data.posts as FeedPostJson[])]);
      setCursor(data.nextCursor);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {posts.map((p) => (
        <PostCard
          key={p.id}
          postId={p.id}
          authorId={p.authorId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          viewerAvatar={viewerAvatar}
          authorName={p.authorName}
          authorImage={p.authorProfilePhotoPath || "/images/defaults/default-avatar-male.jpg"}
          publishedLabel={formatRelativeTime(p.createdAt)}
          text={p.body}
          imageSrc={p.imagePath}
          videoSrc={p.videoPath}
          link={p.link}
          postedIn={p.postedInLabel && p.postedInHref ? { label: p.postedInLabel, href: p.postedInHref } : null}
          initialLikeCount={p.likeCount}
          initialLiked={p.likedByViewer}
          initialCommentCount={p.commentCount}
          isLoggedIn={isLoggedIn}
        />
      ))}
      {error && <p role="alert" style={{ color: "#c0392b", textAlign: "center" }}>{error}</p>}
      {cursor ? (
        <div style={{ textAlign: "center", margin: "10px 0 30px" }}>
          <button type="button" className="mtr-btn signup" onClick={loadMore} disabled={loading}>
            <span>{loading ? "Loading…" : "Load more posts"}</span>
          </button>
        </div>
      ) : posts.length > 0 ? (
        <p style={{ textAlign: "center", color: "#999", margin: "10px 0 30px" }}>You're all caught up.</p>
      ) : null}
    </>
  );
}
