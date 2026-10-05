import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import StreamWatchClient from "@/components/StreamWatchClient";
import PassportVisitBeacon from "@/components/PassportVisitBeacon";
import PuebloLiveHero from "@/components/PuebloLiveHero";
import SeeSomethingPromo from "@/components/SeeSomethingPromo";
import { getCurrentUser } from "@/lib/require-user";
import {
  getStreamById,
  getLiveViewerCount,
  getTotalViewerSessionCount,
  getStreamPinnedItem,
  getStreamPollUserVote,
  listStreamMilestones,
  getDealById,
  getActiveStreamFlashDrop,
  getStreamFlashDropClaimCount,
  hasClaimedStreamFlashDrop,
  listBusinessesForOwner,
  listAllDealsForBusiness,
  listStreams,
  listQaQuestions,
  listStreamSponsors,
  listStreamClips,
  listBusinesses,
} from "@/lib/db";
import { toEmbedSrc } from "@/lib/stream-embed";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const streamId = Number(params.id);
  const stream = Number.isInteger(streamId) ? getStreamById(streamId, null) : undefined;
  return { title: stream ? stream.title : "Pueblo Live" };
}

export default async function StreamDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) notFound();

  const session = await getCurrentUser();
  const stream = getStreamById(streamId, session?.sub ?? null);
  if (!stream) notFound();

  const isHost = session?.sub === stream.host_id;
  const isAdmin = session?.role === "admin";
  const embedSrc = toEmbedSrc(stream.platform, stream.embed_url);

  const pinned = getStreamPinnedItem(stream.id);
  const pinnedShaped =
    pinned === null
      ? null
      : pinned.type === "poll"
      ? {
          type: "poll" as const,
          poll: { id: pinned.poll.id, question: pinned.poll.question, closedAt: pinned.poll.closed_at },
          options: pinned.options.map((o) => ({ id: o.id, text: o.option_text, voteCount: o.vote_count })),
          myVote: session ? getStreamPollUserVote(pinned.poll.id, session.sub) : null,
        }
      : {
          type: "announcement" as const,
          announcement: { id: pinned.announcement.id, body: pinned.announcement.body, createdAt: pinned.announcement.created_at },
        };

  const milestones = listStreamMilestones(stream.id).map((m) => {
    const deal = m.deal_id ? getDealById(m.deal_id) : undefined;
    return {
      id: m.id,
      goalValue: m.goal_value,
      rewardDescription: m.reward_description,
      reached: m.reached_at !== null,
      deal: deal ? { id: deal.id, title: deal.title, businessSlug: deal.business_slug } : null,
    };
  });

  const activeFlashDrop = getActiveStreamFlashDrop(stream.id);
  const activeFlashDropShaped = activeFlashDrop
    ? {
        id: activeFlashDrop.id,
        type: activeFlashDrop.type,
        label: activeFlashDrop.label,
        expiresAt: activeFlashDrop.expires_at,
        claimCount: getStreamFlashDropClaimCount(activeFlashDrop.id),
        claimedByViewer: session ? hasClaimedStreamFlashDrop(activeFlashDrop.id, session.sub) : false,
      }
    : null;

  const qaQuestions = listQaQuestions(stream.id, session?.sub ?? null).map((q) => ({
    id: q.id,
    authorId: q.author_id,
    authorName: [q.author_first_name, q.author_last_name].filter(Boolean).join(" ") || q.author_username,
    authorProfilePhotoPath: q.author_profile_photo_path,
    body: q.body,
    status: q.status,
    createdAt: q.created_at,
    voteCount: q.vote_count,
    votedByViewer: Boolean(q.voted_by_viewer),
  }));

  const sponsors = listStreamSponsors(stream.id).map((s) => ({
    id: s.id,
    businessId: s.business_id,
    businessName: s.business_name,
    businessSlug: s.business_slug,
    businessCategory: s.business_category,
    businessLogoPath: s.business_logo_path,
  }));

  const clips = listStreamClips(stream.id).map((c) => ({
    id: c.id,
    label: c.label,
    timestampSeconds: c.timestamp_seconds,
  }));

  // For the host's "add a sponsor" picker — the whole directory, same
  // list the /businesses page itself browses.
  const allBusinesses =
    isHost || isAdmin ? listBusinesses().map((b) => ({ id: b.id, name: b.name, category: b.category })) : [];

  // Upcoming schedule widget — other scheduled streams, soonest first
  // (listStreams("scheduled", ...) already orders that way).
  const upcomingStreams = listStreams("scheduled", session?.sub ?? null)
    .filter((s) => s.id !== stream.id)
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      title: s.title,
      hostName: [s.host_first_name, s.host_last_name].filter(Boolean).join(" ") || s.host_username,
      scheduledFor: s.scheduled_for,
    }));

  // Deals the host could attach to a milestone or a deal-type flash
  // drop — every active deal across every business they own.
  const hostDeals =
    isHost && session
      ? listBusinessesForOwner(session.sub).flatMap((b) =>
          listAllDealsForBusiness(b.id)
            .filter((d) => Boolean(d.is_active))
            .map((d) => ({ id: d.id, title: d.title, businessName: b.name }))
        )
      : [];

  return (
    <>
      <Header />
      <section>
        <div className="gap2 top-margin">
          <div className="container">
            <div className="row merged20" id="page-contents">
              <div className="col-lg-3">
                <Sidebar />
                <SeeSomethingPromo />
              </div>
              <div className="col-lg-9">
                <PuebloLiveHero isLoggedIn={Boolean(session)} />
                <PassportVisitBeacon
                  isLoggedIn={Boolean(session)}
                  category="pueblo_live"
                  refId={stream.id}
                  label={`Watched ${stream.title}`}
                />
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 18,
                    padding: "16px 20px",
                    marginBottom: 18,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    boxShadow: "0 1px 6px rgba(11,42,91,0.08)",
                  }}
                >
                  <img
                    src={stream.host_profile_photo_path || "/images/defaults/default-avatar-male.jpg"}
                    alt=""
                    style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ margin: "0 0 2px", color: "#0b2a5b", fontSize: 22, fontWeight: 800 }}>{stream.title}</h3>
                    <div style={{ color: "#4b5b73", fontSize: 14 }}>
                      Hosted by{" "}
                      <a href={`/profile/${stream.host_id}`} style={{ color: "#4b5b73", fontWeight: 600 }}>
                        {[stream.host_first_name, stream.host_last_name].filter(Boolean).join(" ") || stream.host_username}
                      </a>
                    </div>
                    {stream.description && (
                      <p style={{ margin: "6px 0 0", color: "#4b5b73", fontSize: 14, lineHeight: 1.5 }}>{stream.description}</p>
                    )}
                  </div>
                  <a href="/live" style={{ color: "#1673f0", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>
                    &larr; All streams
                  </a>
                </div>
                <StreamWatchClient
                  streamId={stream.id}
                  embedSrc={embedSrc}
                  status={stream.status}
                  isHost={isHost}
                  isAdmin={isAdmin}
                  isLoggedIn={Boolean(session)}
                  initialLikeCount={stream.like_count}
                  initialLiked={Boolean(stream.liked_by_viewer)}
                  initialLiveViewerCount={stream.status === "live" ? getLiveViewerCount(stream.id) : null}
                  initialTotalViewCount={stream.status === "ended" ? getTotalViewerSessionCount(stream.id) : null}
                  initialPinned={pinnedShaped}
                  initialMilestones={milestones}
                  initialActiveFlashDrop={activeFlashDropShaped}
                  hostDeals={hostDeals}
                  initialQaQuestions={qaQuestions}
                  initialSponsors={sponsors}
                  initialClips={clips}
                  allBusinesses={allBusinesses}
                  upcomingStreams={upcomingStreams}
                  platform={stream.platform}
                  rawEmbedUrl={stream.embed_url}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
