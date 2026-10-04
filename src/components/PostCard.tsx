"use client";

import { useState } from "react";

type PostCardProps = {
  authorName: string;
  authorImage: string;
  publishedLabel: string;
  text: string;
  initialLikes?: number;
  initialComments?: number;
};

/**
 * One feed post. The like button is real, working client-side state (click
 * it — the count changes). It is NOT persisted anywhere: there is no
 * backend yet, so a page refresh resets it. That's the honest line between
 * "works in the browser" and "works for real" — see FUNCTIONALITY_STATUS.md.
 */
export default function PostCard({
  authorName,
  authorImage,
  publishedLabel,
  text,
  initialLikes = 0,
  initialComments = 0,
}: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<string[]>([]);

  function toggleLike() {
    setLiked((wasLiked) => {
      setLikeCount((count) => (wasLiked ? count - 1 : count + 1));
      return !wasLiked;
    });
  }

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    // STATUS: client-side only — not saved to a server. Refreshing the page
    // loses this comment. Needs a real posts/comments API.
    setComments((prev) => [...prev, commentText.trim()]);
    setCommentText("");
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
                    <ins>{initialComments + comments.length}</ins>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="coment-area">
          <ul className="we-comet">
            {comments.map((c, i) => (
              <li className="post-comment" key={i}>
                <div className="comet-avatar">
                  <img src="/images/resources/admin.jpg" alt="" />
                </div>
                <div className="post-comt-box">
                  <h5>You</h5>
                  <p>{c}</p>
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
                    placeholder="Post your comment (press Enter to post)"
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
