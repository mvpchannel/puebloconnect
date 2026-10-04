import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import DealClaimButton from "@/components/DealClaimButton";
import { getCurrentUser } from "@/lib/require-user";
import { viewerAvatarSrc } from "@/lib/viewer";
import { listFeedPosts, getFeaturedDeal, hasClaimedDeal } from "@/lib/db";
import { formatRelativeTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Newsfeed",
};

// Shows every member post (main feed, walls, groups, businesses, events),
// newest first. Real posts API now backs this page — see src/lib/db.ts (posts table)
// and src/app/api/posts/*. Rendered server-side so the first paint
// already has real data (and already knows whether the viewer liked each
// post) instead of a loading flash; PostComposer/PostCard call the API
// client-side for actions and router.refresh() to pick up changes.
export default async function NewsfeedPage() {
  const session = await getCurrentUser();
  const viewerAvatar = viewerAvatarSrc(session?.sub ?? null);
  const posts = listFeedPosts(session?.sub ?? null);
  const dealOfTheDay = getFeaturedDeal();

  return (
    <>
      <Header />
      <section>
        <div className="gap2 top-margin">
          <div className="container">
            <div className="row merged20" id="page-contents">
              <div className="col-lg-3">
                <Sidebar />
                {dealOfTheDay && (
                  <div className="widget stick-widget" style={{ marginTop: 20 }}>
                    <h4 className="widget-title">🔥 Deal of the Day</h4>
                    <div style={{ padding: "0 16px 16px" }}>
                      <p style={{ marginBottom: 4 }}>
                        <strong>{dealOfTheDay.title}</strong> — {dealOfTheDay.discount_text}
                      </p>
                      <p style={{ fontSize: 13, color: "#999", marginBottom: 10 }}>
                        <Link href={`/businesses/${dealOfTheDay.business_slug}`} title="">
                          {dealOfTheDay.business_name}
                        </Link>
                      </p>
                      {session ? (
                        <DealClaimButton
                          businessSlug={dealOfTheDay.business_slug}
                          dealId={dealOfTheDay.id}
                          isLoggedIn={Boolean(session)}
                          initialClaimed={hasClaimedDeal(dealOfTheDay.id, session.sub)}
                        />
                      ) : (
                        <Link href="/login" title="" style={{ fontSize: 12 }}>Log in to claim</Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="col-lg-6">
                <PostComposer avatarSrc={viewerAvatar} isLoggedIn={Boolean(session)} />
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
                      viewerAvatar={viewerAvatar}
                      postedIn={
                        post.posted_in_label && post.posted_in_href
                          ? { label: post.posted_in_label, href: post.posted_in_href }
                          : null
                      }
                      key={post.id}
                      postId={post.id}
                      authorId={post.author_id}
                      currentUserId={session?.sub ?? null}
                      isAdmin={session?.role === "admin"}
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
                      imageSrc={post.image_path}
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
