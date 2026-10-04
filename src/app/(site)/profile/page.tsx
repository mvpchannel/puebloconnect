import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import { getCurrentUser } from "@/lib/require-user";
import { getUserById, listPostsByAuthor } from "@/lib/db";
import { formatRelativeTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Timeline",
};

// Real posts now: this member's own posts (any target), newest first —
// see src/lib/db.ts listPostsByAuthor. The page still works logged out
// (an anonymous visitor just can't post), same honest-placeholder pattern
// as the rest of this app for the parts not built yet (followers, photos,
// videos, friends tabs).
export default async function ProfilePage() {
  const session = await getCurrentUser();
  const user = session ? getUserById(session.sub) : null;
  const posts = session ? listPostsByAuthor(session.sub, session.sub) : [];
  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username
    : "Pueblo Connect";

  return (
    <>
      <Header />

      <section>
        <div className="feature-photo">
          <figure>
            <img src="/images/resources/timeline-1.jpg" alt="" />
          </figure>
          <div className="add-btn">
            <span>0 followers</span>
            {/* STATUS: needs backend/API — follower count and "Add Friend" are static for now. */}
            <a href="#" title="" data-ripple="">Add Friend</a>
          </div>
          <div className="container-fluid">
            <div className="row merged">
              <div className="col-lg-2 col-sm-3">
                <div className="user-avatar">
                  <figure>
                    <img src="/images/resources/user-avatar.jpg" alt="" />
                  </figure>
                </div>
              </div>
              <div className="col-lg-10 col-sm-9">
                <div className="timeline-info">
                  <ul>
                    <li className="admin-name">
                      <h5>{displayName}&nbsp;</h5>
                      <span>Member</span>
                    </li>
                    <li>
                      <a className="active" href="#" title="" data-ripple="">Timeline</a>
                      <a className="" href="#" title="" data-ripple="">Photos</a>
                      <a className="" href="#" title="" data-ripple="">Videos</a>
                      <a className="" href="/friends" title="" data-ripple="">Friends</a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="gap gray-bg">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="row merged20" id="page-contents">
                  <div className="col-lg-3">
                    <Sidebar />
                  </div>
                  <div className="col-lg-6">
                    <PostComposer isLoggedIn={Boolean(session)} />
                    <div className="loadMore">
                      {session && posts.length === 0 && (
                        <div className="central-meta item">
                          <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                            You haven&apos;t posted anything yet.
                          </div>
                        </div>
                      )}
                      {posts.map((post) => (
                        <PostCard
                          key={post.id}
                          postId={post.id}
                          authorId={post.author_id}
                          currentUserId={session?.sub ?? null}
                          isAdmin={session?.role === "admin"}
                          authorName={displayName}
                          authorImage={
                            post.author_profile_photo_path ||
                            "/images/defaults/default-avatar-male.jpg"
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
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
