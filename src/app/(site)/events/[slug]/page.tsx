import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import EventRsvpPanel from "@/components/EventRsvpPanel";
import { getCurrentUser } from "@/lib/require-user";
import { viewerAvatarSrc } from "@/lib/viewer";
import {
  getEventBySlug,
  getRsvpStatus,
  isCheckedIn,
  listEventAttendees,
  listEventCheckins,
  listPosts,
} from "@/lib/db";
import { formatRelativeTime } from "@/lib/time";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const event = getEventBySlug(params.slug);
  return { title: event ? event.title : "Event" };
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// A single event: info, RSVP + check-in, attendee/check-in lists, and its
// wall (reusing posts/PostComposer/PostCard, target_type='event').
export default async function EventDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const event = getEventBySlug(params.slug);
  if (!event) notFound();

  const session = await getCurrentUser();
  const viewerAvatar = viewerAvatarSrc(session?.sub ?? null);
  const rsvpStatus = session ? getRsvpStatus(event.id, session.sub) : null;
  const checkedIn = session ? isCheckedIn(event.id, session.sub) : false;
  const attendees = listEventAttendees(event.id, 20);
  const checkins = listEventCheckins(event.id, 20);
  const posts = listPosts(session?.sub ?? null, "event", event.id);

  return (
    <>
      <Header />
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
                      <h5>{event.title}&nbsp;</h5>
                      <span>
                        {formatEventDate(event.starts_at)}
                        {event.location_text && ` · ${event.location_text}`}
                      </span>
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
                      <h4 className="widget-title">About this event</h4>
                      <div style={{ padding: "0 16px 16px", fontSize: 13, color: "#666" }}>
                        {event.description && <p>{event.description}</p>}
                        {event.location_text && <p><i className="fa fa-location-arrow" /> {event.location_text}</p>}
                        {event.business_name && (
                          <p>
                            Hosted by{" "}
                            <Link href={`/businesses/${event.business_slug}`} title="">{event.business_name}</Link>
                          </p>
                        )}
                        <p style={{ color: "#999" }}>Created by {event.creator_username}</p>
                      </div>
                      <div style={{ padding: "0 16px 16px" }}>
                        <EventRsvpPanel
                          slug={event.slug}
                          isLoggedIn={Boolean(session)}
                          initialStatus={rsvpStatus}
                          initialCheckedIn={checkedIn}
                        />
                      </div>
                    </div>

                    <div className="widget stick-widget" style={{ marginTop: 20 }}>
                      <h4 className="widget-title">
                        Attending ({event.going_count} going · {event.interested_count} interested)
                      </h4>
                      <ul className="naves">
                        {attendees.length === 0 && (
                          <li style={{ color: "#888" }}>No RSVPs yet.</li>
                        )}
                        {attendees.map((a) => (
                          <li key={a.user_id}>
                            <i className="ti-user" />
                            <span>
                              {[a.first_name, a.last_name].filter(Boolean).join(" ") || a.username}
                              {a.status === "going" ? "" : " (interested)"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {checkins.length > 0 && (
                      <div className="widget stick-widget" style={{ marginTop: 20 }}>
                        <h4 className="widget-title">Checked in ({event.checkin_count})</h4>
                        <ul className="naves">
                          {checkins.map((c) => (
                            <li key={c.user_id}>
                              <i className="ti-check" />
                              <span>{[c.first_name, c.last_name].filter(Boolean).join(" ") || c.username}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="col-lg-6">
                    <PostComposer avatarSrc={viewerAvatar}
                      isLoggedIn={Boolean(session)}
                      targetType="event"
                      targetId={event.id}
                    />
                    <div className="loadMore">
                      {posts.length === 0 && (
                        <div className="central-meta item">
                          <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                            No posts yet on this event&apos;s wall.
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
