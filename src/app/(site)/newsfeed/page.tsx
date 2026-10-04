import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import { getCurrentUser } from "@/lib/require-user";
import { listPosts } from "@/lib/db";
import { formatRelativeTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Newsfeed",
};

// Real posts API now backs this page — see src/lib/db.ts (posts table)
// and src/app/api/posts/*. Rendered server-side so the first paint
// already has real data (and already knows whether the viewer liked each
// post) instead of a loading flash; PostComposer/PostCard call the API
// client-side for actions and router.refresh() to pick up changes.
export default async function NewsfeedPage() {
  const session = await getCurrentUser();
  const posts = listPosts(session?.sub ?? null, "feed", null);

  return (
    <>
      <Header />
      <section>
        <div className="gap2 top-margin">
          <div className="container">
            <div className="row merged20" id="page-contents">
              <div className="col-lg-3">
                <Sidebar />
              </div>
              <div className="col-lg-6">
                <PostComposer isLoggedIn={Boolean(session)} />
                <div className="loadMore">
                  {posts.length === 0 && (
                    <div className="central-meta item">
                      <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                        No posts yet — be the first to post something.
                      </div>
                    </div>
                  )}
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      postId={post.id}
                      authorName={
                        [post.author_first_name, post.author_last_name]
                          .filter(Boolean)
                          .join(" ") || post.author_username
                      }
                      authorImage={
                        post.author_profile_photo_path || "/images/defaults/default-avatar-male.jpg"
                      }
                      publishedLabel={formatRelativeTime(post.created_at)}
                      text={post.body}
                      initialLikeCount={post.like_count}
                      initialLiked={Boolean(post.liked_by_viewer)}
                      initialCommentCount={post.comment_count}
                      isLoggedIn={Boolean(session)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
