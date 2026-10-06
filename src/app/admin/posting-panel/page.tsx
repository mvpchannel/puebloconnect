import type { Metadata } from "next";
import Link from "next/link";
import { listFeedPosts } from "@/lib/db";
import { formatRelativeTime } from "@/lib/time";
import AdminPostForm from "./AdminPostForm";
import DeletePostButton from "./DeletePostButton";

export const metadata: Metadata = {
  title: "Create a Post",
};

// Real tool: staff write a post (text, one photo or one video) that goes on the
// newsfeed under their own account, and can delete any recent post. Editing and
// scheduling posts are not built yet.
export const dynamic = "force-dynamic";

export default function PostingPanelPage() {
  const posts = listFeedPosts(null, 20);
  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 12 }}>Create a Post</h2>
        <p style={{ color: "#555", marginBottom: 18 }}>
          Write a post for the newsfeed. It appears under your own account right away. Editing a post after
          it&rsquo;s published and scheduling a post for later are not built yet.
        </p>
        <AdminPostForm />
        <h4 style={{ marginBottom: 10 }}>Latest on the newsfeed</h4>
        {posts.length === 0 ? (
          <p style={{ color: "#888" }}>No posts yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Posted</th>
                <th>By</th>
                <th>Post</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatRelativeTime(p.created_at)}</td>
                  <td>
                    <Link href={`/profile/${p.author_id}`}>
                      {[p.author_first_name, p.author_last_name].filter(Boolean).join(" ") || p.author_username}
                    </Link>
                  </td>
                  <td style={{ whiteSpace: "pre-wrap", maxWidth: 460 }}>
                    {p.body || <span style={{ color: "#888" }}>(no text)</span>}
                    {p.image_path && <div style={{ color: "#888", fontSize: 12 }}>+ photo</div>}
                    {p.video_path && <div style={{ color: "#888", fontSize: 12 }}>+ video</div>}
                    {p.posted_in_label && <div style={{ color: "#888", fontSize: 12 }}>in {p.posted_in_label}</div>}
                  </td>
                  <td><DeletePostButton id={p.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
