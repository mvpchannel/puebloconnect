import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import LoadMoreFeed from "@/components/LoadMoreFeed";
import BusinessFollowButton from "@/components/BusinessFollowButton";
import BusinessReviewsPanel from "@/components/BusinessReviewsPanel";
import BusinessOwnerPanel from "@/components/BusinessOwnerPanel";
import DealClaimButton from "@/components/DealClaimButton";
import PassportVisitBeacon from "@/components/PassportVisitBeacon";
import { getCurrentUser } from "@/lib/require-user";
import { viewerAvatarSrc } from "@/lib/viewer";
import {
  getBusinessBySlug,
  isFollowingBusiness,
  isBusinessOwner,
  listPosts,
  listBusinessReviews,
  listBusinessMenuItems,
  listBusinessJobs,
  listStreamsForBusiness,
  listEventsForBusiness,
  listActiveDealsForBusiness,
  listAllDealsForBusiness,
  hasClaimedDeal,
  listBopWinsForBusiness,
} from "@/lib/db";
import { formatRelativeTime } from "@/lib/time";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const business = getBusinessBySlug(params.slug);
  return { title: business ? business.name : "Business Channel" };
}

// A single business's channel: profile info, follow, its wall (reusing
// the same posts/PostComposer/PostCard machinery as the newsfeed/groups —
// target_type='business'), reviews, menu/services, jobs, and that
// business's live/past Pueblo Live broadcasts.
export default async function BusinessChannelPage({
  params,
}: {
  params: { slug: string };
}) {
  const business = getBusinessBySlug(params.slug);
  if (!business) notFound();

  const session = await getCurrentUser();
  const viewerAvatar = viewerAvatarSrc(session?.sub ?? null);
  const isOwner = session ? isBusinessOwner(business.id, session.sub) : false;
  const isFollowing = session ? isFollowingBusiness(business.id, session.sub) : false;
  const postRows = listPosts(session?.sub ?? null, "business", business.id, 31);
  const posts = postRows.slice(0, 30);
  const lastPost = posts[posts.length - 1];
  const nextCursor =
    postRows.length > 30 && lastPost ? `${lastPost.created_at}|${lastPost.id}` : null;
  const reviews = listBusinessReviews(business.id);
  const menuItems = listBusinessMenuItems(business.id);
  const jobs = listBusinessJobs(business.id);
  const streams = listStreamsForBusiness(business.id, session?.sub ?? null, 5);
  const events = listEventsForBusiness(business.id);
  const activeDeals = listActiveDealsForBusiness(business.id);
  const allDeals = isOwner ? listAllDealsForBusiness(business.id) : [];
  const bopWins = listBopWinsForBusiness(business.id);

  const shapedReviews = reviews.map((r) => ({
    id: r.id,
    userId: r.user_id,
    rating: r.rating,
    body: r.body,
    createdAt: r.created_at,
    name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.username,
    profilePhotoPath: r.profile_photo_path,
  }));

  return (
    <>
      <Header />
      <PassportVisitBeacon
        isLoggedIn={Boolean(session)}
        category="business"
        refId={business.id}
        label={`Visited ${business.name}`}
      />
      <section>
        <div className="feature-photo">
          <figure>
            <img src="/images/resources/timeline-1.jpg" alt="" />
          </figure>
          <div className="container-fluid">
            <div className="row merged">
              <div className="col-lg-12">
                <div className="timeline-info">
                  <ul>
                    <li className="admin-name">
                      <h5>{business.name}&nbsp;</h5>
                      <span>
                        {business.category} · {business.follower_count} follower
                        {business.follower_count === 1 ? "" : "s"} · {business.post_count} post
                        {business.post_count === 1 ? "" : "s"}
                      </span>
                      {bopWins.length > 0 && (
                        <span style={{ display: "block", marginTop: 4 }}>
                          {bopWins.map((w) => (
                            <span
                              key={w.id}
                              title={`${w.category_name} — ${w.period_label}`}
                              style={{
                                display: "inline-block",
                                background: "#f5a623",
                                color: "#fff",
                                borderRadius: 4,
                                padding: "2px 8px",
                                marginRight: 6,
                                fontSize: 12,
                              }}
                            >
                              🏆 {w.category_name}
                            </span>
                          ))}
                        </span>
                      )}
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
                    <div className="widget stick-widget" style={{ marginTop: 20 }}>
                      <h4 className="widget-title">About</h4>
                      <div style={{ padding: "0 16px 16px", fontSize: 13, color: "#666" }}>
                        {business.description && <p>{business.description}</p>}
                        {business.address && <p><i className="fa fa-location-arrow" /> {business.address}</p>}
                        {business.phone && <p><i className="fa fa-phone" /> {business.phone}</p>}
                        {business.website && (
                          <p>
                            <i className="fa fa-globe" />{" "}
                            <a href={business.website} target="_blank" rel="noreferrer">
                              {business.website}
                            </a>
                          </p>
                        )}
                        {business.hours_text && <p><i className="fa fa-clock-o" /> {business.hours_text}</p>}
                        <p style={{ color: "#999" }}>Owned by {business.owner_username}</p>
                      </div>
                      <div style={{ padding: "0 16px 16px" }}>
                        <BusinessFollowButton
                          slug={business.slug}
                          isLoggedIn={Boolean(session)}
                          isOwner={isOwner}
                          initialIsFollowing={isFollowing}
                        />
                      </div>
                    </div>

                    {activeDeals.length > 0 && (
                      <div className="widget stick-widget" style={{ marginTop: 20 }}>
                        <h4 className="widget-title">Deals</h4>
                        <div style={{ padding: "0 16px 16px" }}>
                          {activeDeals.map((deal) => (
                            <div key={deal.id} style={{ marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #eee" }}>
                              <div style={{ fontSize: 13, marginBottom: 4 }}>
                                {deal.type === "flash" && <strong style={{ color: "#e02020" }}>🔥 FLASH DEAL </strong>}
                                <strong>{deal.title}</strong> — {deal.discount_text}
                              </div>
                              {deal.type === "flash" && deal.expires_at && (
                                <div style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>
                                  Expires {new Date(deal.expires_at).toLocaleString(undefined, {
                                    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                                  })}
                                </div>
                              )}
                              {session && !isOwner && (
                                <DealClaimButton
                                  businessSlug={business.slug}
                                  dealId={deal.id}
                                  isLoggedIn={Boolean(session)}
                                  initialClaimed={hasClaimedDeal(deal.id, session.sub)}
                                />
                              )}
                              {!session && (
                                <Link href="/login" title="" style={{ fontSize: 12 }}>Log in to claim</Link>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {menuItems.length > 0 && (
                      <div className="widget stick-widget" style={{ marginTop: 20 }}>
                        <h4 className="widget-title">Menu &amp; services</h4>
                        <ul className="naves">
                          {menuItems.map((item) => (
                            <li key={item.id}>
                              <span>
                                {item.name}
                                {item.price_cents !== null && ` — $${(item.price_cents / 100).toFixed(2)}`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {jobs.length > 0 && (
                      <div className="widget stick-widget" style={{ marginTop: 20 }}>
                        <h4 className="widget-title">Jobs</h4>
                        <ul className="naves">
                          {jobs.map((job) => (
                            <li key={job.id}>
                              <span>{job.title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {events.length > 0 && (
                      <div className="widget stick-widget" style={{ marginTop: 20 }}>
                        <h4 className="widget-title">Events</h4>
                        <ul className="naves">
                          {events.map((ev) => (
                            <li key={ev.id}>
                              <Link href={`/events/${ev.slug}`} title="">{ev.title}</Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {streams.length > 0 && (
                      <div className="widget stick-widget" style={{ marginTop: 20 }}>
                        <h4 className="widget-title">Pueblo Live</h4>
                        <ul className="naves">
                          {streams.map((s) => (
                            <li key={s.id}>
                              <Link href={`/live/${s.id}`} title="">
                                {s.title} {s.status === "live" ? "🔴" : ""}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {isOwner && (
                      <BusinessOwnerPanel
                        slug={business.slug}
                        menuItems={menuItems}
                        jobs={jobs}
                        deals={allDeals.map((d) => ({
                          id: d.id,
                          title: d.title,
                          discountText: d.discount_text,
                          type: d.type,
                          expiresAt: d.expires_at,
                          claimCount: d.claim_count,
                          isActive: Boolean(d.is_active),
                        }))}
                      />
                    )}

                    <BusinessReviewsPanel
                      slug={business.slug}
                      isLoggedIn={Boolean(session)}
                      reviews={shapedReviews}
                      averageRating={business.average_rating}
                      reviewCount={business.review_count}
                    />
                  </div>
                  <div className="col-lg-6">
                    <PostComposer avatarSrc={viewerAvatar}
                      isLoggedIn={Boolean(session)}
                      targetType="business"
                      targetId={business.id}
                    />
                    <div className="loadMore">
                      {posts.length === 0 && (
                        <div className="central-meta item">
                          <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                            No posts yet on this channel&apos;s wall.
                          </div>
                        </div>
                      )}
                      {posts.map((post) => (
                        <PostCard
                      viewerAvatar={viewerAvatar}
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
                            post.author_profile_photo_path ||
                            "/images/defaults/default-avatar-male.jpg"
                          }
                          publishedLabel={formatRelativeTime(post.created_at)}
                          text={post.body}
                          imageSrc={post.image_path}
                          videoSrc={post.video_path}
                          initialLikeCount={post.like_count}
                          initialLiked={Boolean(post.liked_by_viewer)}
                          initialCommentCount={post.comment_count}
                          isLoggedIn={Boolean(session)}
                        />
                      ))}
                      <LoadMoreFeed
                        initialCursor={nextCursor}
                        isLoggedIn={Boolean(session)}
                        currentUserId={session?.sub ?? null}
                        isAdmin={session?.role === "admin"}
                        viewerAvatar={viewerAvatar}
                        scope={`targetType=business&targetId=${business.id}`}
                      />
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
