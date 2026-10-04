import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import ProfileActions from "@/components/ProfileActions";
import { getCurrentUser } from "@/lib/require-user";
import { getUserById, listPostsByAuthor, listFriends, areFriends, getFriendRequestBetween } from "@/lib/db";
import { formatRelativeTime } from "@/lib/time";

type Props = { params: { userId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = Number(params.userId);
  const user = Number.isInteger(id) ? getUserById(id) : undefined;
  if (!user) return { title: "Profile" };
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
  return { title: `${name}'s Timeline` };
}

// Any member's public wall — /profile (no id) redirects a logged-in
// visitor straight here with their own id (see src/app/(site)/profile/
// page.tsx). Posts shown are the same posts table/target_type='feed' rows
// the main /newsfeed pools from (see listPostsByAuthor in src/lib/db.ts) —
// a post made from this page's composer IS a feed post, nothing to
// syndicate separately. The post composer only renders for the profile's
// own owner; a visitor gets Add Friend / Message actions instead.
export default async function MemberProfilePage({ params }: Props) {
  const targetId = Number(params.userId);
  if (!Number.isInteger(targetId) || targetId <= 0) notFound();

  const profileUser = getUserById(targetId);
  if (!profileUser) notFound();

  const session = await getCurrentUser();
  const isOwner = session?.sub === targetId;
  const posts = listPostsByAuthor(session?.sub ?? null, targetId);
  const friendCount = listFriends(targetId).length;
  const displayName =
    [profileUser.first_name, profileUser.last_name].filter(Boolean).join(" ") || profileUser.username;

  let isFriend = false;
  let pendingDirection: "incoming" | "outgoing" | undefined;
  let pendingRequestId: number | null = null;
  if (session && !isOwner) {
    isFriend = areFriends(session.sub, targetId);
    if (!isFriend) {
      const pending = getFriendRequestBetween(session.sub, targetId);
      if (pending && pending.status === "pending") {
        pendingDirection = pending.sender_id === session.sub ? "outgoing" : "incoming";
        pendingRequestId = pending.id;
      }
    }
  }

  return (
    <>
      <Header />

      <section>
        <div className="feature-photo">
          <figure>
            <img
              src={profileUser.cover_photo_path || "/images/resources/timeline-1.jpg"}
              alt=""
            />
          </figure>
          <div className="add-btn">
            <span>{friendCount} friend{friendCount === 1 ? "" : "s"}</span>
            {isOwner ? (
              <a href="/friends" title="" data-ripple="">Manage Friends</a>
            ) : session ? (
              <ProfileActions
                targetUserId={targetId}
                initialIsFriend={isFriend}
                initialPendingDirection={pendingDirection}
                initialPendingRequestId={pendingRequestId}
              />
            ) : (
              <a href="/login" title="" data-ripple="">Log in to connect</a>
            )}
          </div>
          <div className="container-fluid">
            <div className="row merged">
              <div className="col-lg-2 col-sm-3">
                <div className="user-avatar">
                  <figure>
                    <img
                      src={profileUser.profile_photo_path || "/images/defaults/default-avatar-male.jpg"}
                      alt=""
                    />
                  </figure>
                </div>
              </div>
              <div className="col-lg-10 col-sm-9">
                <div className="timeline-info">
                  <ul>
                    <li className="admin-name">
                      <h5>{displayName}&nbsp;</h5>
                      <span>{isOwner ? "Member (you)" : "Member"}</span>
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
                    {profileUser.bio && (
                      <div className="central-meta item" style={{ marginBottom: 20 }}>
                        <div style={{ padding: 20 }}>
                          <h5 style={{ marginBottom: 8 }}>About</h5>
                          <p style={{ color: "#555", whiteSpace: "pre-wrap" }}>{profileUser.bio}</p>
                        </div>
                      </div>
                    )}
                    {isOwner && <PostComposer isLoggedIn={Boolean(session)} />}
                    <div className="loadMore">
                      {posts.length === 0 && (
                        <div className="central-meta item">
                          <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                            {isOwner ? "You haven't posted anything yet." : `${displayName} hasn't posted anything yet.`}
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
