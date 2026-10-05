"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toEmbedSrc } from "@/lib/stream-embed";

type StreamStatus = "scheduled" | "live" | "ended";

type Comment = {
  id: number;
  authorId: number;
  authorName: string;
  authorProfilePhotoPath: string | null;
  authorBadges: string[];
  body: string;
};

type Report = {
  id: number;
  commentId: number;
  commentBody: string;
  commentAuthorId: number;
  commentAuthorUsername: string;
  reporterUsername: string;
  reason: string;
};

type ReactionEmoji = "heart" | "fire" | "clap" | "laugh" | "wow";
const REACTION_GLYPHS: Record<ReactionEmoji, string> = {
  heart: "❤️",
  fire: "🔥",
  clap: "👏",
  laugh: "😂",
  wow: "😮",
};

type FloatingReaction = { key: string; emoji: ReactionEmoji; left: number };

type PinnedPoll = {
  type: "poll";
  poll: { id: number; question: string; closedAt: string | null };
  options: { id: number; text: string; voteCount: number }[];
  myVote: number | null;
};
type PinnedAnnouncement = {
  type: "announcement";
  announcement: { id: number; body: string; createdAt: string };
};
type Pinned = PinnedPoll | PinnedAnnouncement | null;

type Milestone = {
  id: number;
  goalValue: number;
  rewardDescription: string;
  reached: boolean;
  deal: { id: number; title: string; businessSlug: string } | null;
};

type FlashDropType = "passport_stamp" | "deal";
type ActiveFlashDrop = {
  id: number;
  type: FlashDropType;
  label: string;
  expiresAt: string;
  claimCount: number;
  claimedByViewer: boolean;
} | null;

type HostDeal = { id: number; title: string; businessName: string };

type QaQuestion = {
  id: number;
  authorId: number;
  authorName: string;
  authorProfilePhotoPath: string | null;
  body: string;
  status: "open" | "answered" | "dismissed";
  createdAt: string;
  voteCount: number;
  votedByViewer: boolean;
};

type SpotlightRequest = {
  id: number;
  userId: number;
  userName: string;
  userProfilePhotoPath: string | null;
  message: string | null;
  status: "pending" | "spotlighted" | "dismissed";
  createdAt: string;
};

type Sponsor = {
  id: number;
  businessId: number;
  businessName: string;
  businessSlug: string;
  businessCategory: string;
  businessLogoPath: string | null;
};

type Clip = { id: number; label: string; timestampSeconds: number };

type DirectoryBusiness = { id: number; name: string; category: string };

type UpcomingStream = { id: number; title: string; hostName: string; scheduledFor: string | null };

type WatchProgress = {
  elapsedSeconds: number;
  thresholdSeconds: number;
  pointsUnlocked: boolean;
  pointsValue: number;
};

type StreamWatchClientProps = {
  streamId: number;
  embedSrc: string;
  status: StreamStatus;
  isHost: boolean;
  isAdmin: boolean;
  isLoggedIn: boolean;
  initialLikeCount: number;
  initialLiked: boolean;
  initialLiveViewerCount: number | null;
  initialTotalViewCount: number | null;
  initialPinned: Pinned;
  initialMilestones: Milestone[];
  initialActiveFlashDrop: ActiveFlashDrop;
  hostDeals: HostDeal[];
  initialQaQuestions: QaQuestion[];
  initialSponsors: Sponsor[];
  initialClips: Clip[];
  allBusinesses: DirectoryBusiness[];
  upcomingStreams: UpcomingStream[];
  platform: "youtube" | "facebook" | "vimeo";
  rawEmbedUrl: string;
};

const HEARTBEAT_INTERVAL_MS = 30_000;
const REACTIONS_POLL_MS = 2_000;
const PINNED_POLL_MS = 5_000;
const FLASH_DROP_POLL_MS = 5_000;
const MILESTONES_POLL_MS = 15_000;
const QA_POLL_MS = 8_000;
const SPOTLIGHT_POLL_MS = 8_000;

// Real backend: src/app/api/streams/[id]/* — likes, comments/chat,
// viewer presence (join/heartbeat/leave), host start/end controls, a
// moderation queue (report/resolve/ban), floating reactions, a pinned
// announcement/poll slot, viewer-count milestones tied to real Deals,
// time-limited flash drops (Passport stamp or Deal claim), and
// watch-to-earn Rewards points — all backed by src/lib/db.ts. The
// <iframe> is the only part of this component that isn't this app's
// own code — it plays the host's own YouTube/Facebook/Vimeo Live
// broadcast (bring-your-own-stream), never video served by Pueblo
// Connect itself.
export default function StreamWatchClient({
  streamId,
  embedSrc,
  status,
  isHost,
  isAdmin,
  isLoggedIn,
  initialLikeCount,
  initialLiked,
  initialLiveViewerCount,
  initialTotalViewCount,
  initialPinned,
  initialMilestones,
  initialActiveFlashDrop,
  hostDeals,
  initialQaQuestions,
  initialSponsors,
  initialClips,
  allBusinesses,
  upcomingStreams,
  platform,
  rawEmbedUrl,
}: StreamWatchClientProps) {
  const router = useRouter();
  const canModerate = isHost || isAdmin;

  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liveViewerCount, setLiveViewerCount] = useState(initialLiveViewerCount);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showModeration, setShowModeration] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [watchProgress, setWatchProgress] = useState<WatchProgress | null>(null);

  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const lastReactionId = useRef(0);

  const [pinned, setPinned] = useState<Pinned>(initialPinned);
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [activeDrop, setActiveDrop] = useState<ActiveFlashDrop>(initialActiveFlashDrop);
  const [dropClaiming, setDropClaiming] = useState(false);

  const [qaQuestions, setQaQuestions] = useState<QaQuestion[]>(initialQaQuestions);
  const [qaDraft, setQaDraft] = useState("");
  const [qaError, setQaError] = useState<string | null>(null);
  const [showQa, setShowQa] = useState(false);

  const [spotlightRequested, setSpotlightRequested] = useState(false);
  const [spotlightRequests, setSpotlightRequests] = useState<SpotlightRequest[]>([]);
  const [showSpotlightQueue, setShowSpotlightQueue] = useState(false);

  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors);
  const [sponsorPickBusinessId, setSponsorPickBusinessId] = useState("");

  const [clips, setClips] = useState<Clip[]>(initialClips);
  const [clipLabel, setClipLabel] = useState("");
  const [clipTimestamp, setClipTimestamp] = useState("");
  const [playbackSrc, setPlaybackSrc] = useState(embedSrc);
  const [activeClipId, setActiveClipId] = useState<number | null>(null);
  const [theaterMode, setTheaterMode] = useState(false);

  const [showHostTools, setShowHostTools] = useState(false);
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [milestoneGoal, setMilestoneGoal] = useState("");
  const [milestoneReward, setMilestoneReward] = useState("");
  const [milestoneDealId, setMilestoneDealId] = useState("");
  const [dropType, setDropType] = useState<FlashDropType>("passport_stamp");
  const [dropLabel, setDropLabel] = useState("");
  const [dropDuration, setDropDuration] = useState("120");
  const [dropDealId, setDropDealId] = useState("");
  const [hostBusy, setHostBusy] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);

  const viewerSessionId = useRef<number | null>(null);

  // Viewer presence: join once on mount, heartbeat every 30s while the
  // page stays open, leave on unmount (best-effort — see the leave
  // route's comment on why heartbeats, not this, are what keeps the
  // count accurate).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/streams/${streamId}/viewers`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) viewerSessionId.current = data.viewerSessionId ?? null;
      });

    const interval = setInterval(() => {
      if (viewerSessionId.current === null) return;
      fetch(`/api/streams/${streamId}/viewers/${viewerSessionId.current}/heartbeat`, {
        method: "POST",
      })
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          if (typeof data.liveViewerCount === "number") setLiveViewerCount(data.liveViewerCount);
          if (data.watchProgress) setWatchProgress(data.watchProgress);
        })
        .catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (viewerSessionId.current !== null) {
        fetch(`/api/streams/${streamId}/viewers/${viewerSessionId.current}/leave`, {
          method: "POST",
        }).catch(() => {});
      }
    };
  }, [streamId]);

  // Chat: load once, then poll — there's no websocket here, so a short
  // poll is the honest, simple way to show other people's messages
  // without the viewer refreshing the page themselves.
  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch(`/api/streams/${streamId}/comments`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setComments(data.comments || []);
        })
        .catch(() => {});
    }
    load();
    const interval = status === "live" ? setInterval(load, 5000) : undefined;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [streamId, status]);

  // Floating reactions: poll for anything newer than the last one shown,
  // drop each into the floating layer, then let it animate out on its own.
  useEffect(() => {
    if (status !== "live") return;
    let cancelled = false;
    const interval = setInterval(() => {
      fetch(`/api/streams/${streamId}/reactions?since=${lastReactionId.current}`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled || !Array.isArray(data.reactions) || data.reactions.length === 0) return;
          const incoming: FloatingReaction[] = data.reactions.map((r: { id: number; emoji: ReactionEmoji }) => ({
            key: `${r.id}-${Math.random()}`,
            emoji: r.emoji,
            left: 10 + Math.random() * 80,
          }));
          lastReactionId.current = data.reactions[data.reactions.length - 1].id;
          setFloatingReactions((prev) => [...prev, ...incoming]);
          incoming.forEach((f) => {
            setTimeout(() => {
              setFloatingReactions((prev) => prev.filter((r) => r.key !== f.key));
            }, 3000);
          });
        })
        .catch(() => {});
    }, REACTIONS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamId, status]);

  // Pinned slot (poll or announcement) — polled so viewers see a host's
  // new pin or live vote tallies without refreshing.
  useEffect(() => {
    if (status !== "live") return;
    let cancelled = false;
    const interval = setInterval(() => {
      fetch(`/api/streams/${streamId}/pinned`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setPinned(data.pinned ?? null);
        })
        .catch(() => {});
    }, PINNED_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamId, status]);

  // Active flash drop — polled so a drop the host just triggered (or one
  // that just expired) shows up without a refresh.
  useEffect(() => {
    if (status !== "live") return;
    let cancelled = false;
    const interval = setInterval(() => {
      fetch(`/api/streams/${streamId}/flash-drops`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setActiveDrop(data.drop ?? null);
        })
        .catch(() => {});
    }, FLASH_DROP_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamId, status]);

  // Milestones — mostly updated already by the heartbeat's own
  // check-and-snapshot, but polled here too so a viewer who isn't the
  // one whose heartbeat crossed the goal still sees it flip.
  useEffect(() => {
    if (status !== "live") return;
    let cancelled = false;
    const interval = setInterval(() => {
      fetch(`/api/streams/${streamId}/milestones`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data.milestones)) {
            setMilestones(
              data.milestones.map((m: { id: number; goalValue: number; rewardDescription: string; reached: boolean; deal: Milestone["deal"] }) => ({
                id: m.id,
                goalValue: m.goalValue,
                rewardDescription: m.rewardDescription,
                reached: m.reached,
                deal: m.deal,
              }))
            );
          }
        })
        .catch(() => {});
    }, MILESTONES_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamId, status]);

  // Q&A queue — polled while live so vote tallies and new questions
  // show up without a refresh.
  useEffect(() => {
    if (status !== "live") return;
    let cancelled = false;
    const interval = setInterval(() => {
      fetch(`/api/streams/${streamId}/qa`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data.questions)) setQaQuestions(data.questions);
        })
        .catch(() => {});
    }, QA_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamId, status]);

  // Spotlight request queue — host/admin only, polled while the queue
  // panel is open.
  useEffect(() => {
    if (!canModerate || !showSpotlightQueue || status !== "live") return;
    let cancelled = false;
    function load() {
      fetch(`/api/streams/${streamId}/spotlight`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data.requests)) setSpotlightRequests(data.requests);
        })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, SPOTLIGHT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamId, status, canModerate, showSpotlightQueue]);

  async function submitQaQuestion(e: FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      setQaError("Log in to ask a question.");
      return;
    }
    const trimmed = qaDraft.trim();
    if (!trimmed) return;
    setQaError(null);
    try {
      const res = await fetch(`/api/streams/${streamId}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQaError(data.error || "Couldn't submit that.");
        return;
      }
      setQaQuestions((prev) => [...prev, data.question]);
      setQaDraft("");
    } catch {
      setQaError("Couldn't reach the server.");
    }
  }

  async function voteOnQuestion(questionId: number) {
    if (!isLoggedIn) {
      setQaError("Log in to vote.");
      return;
    }
    // Optimistic toggle, then reconcile with the server's count.
    setQaQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, votedByViewer: !q.votedByViewer, voteCount: q.voteCount + (q.votedByViewer ? -1 : 1) }
          : q
      )
    );
    try {
      const res = await fetch(`/api/streams/${streamId}/qa/${questionId}/vote`, { method: "POST" });
      const data = await res.json();
      if (res.ok && typeof data.voteCount === "number") {
        setQaQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, voteCount: data.voteCount } : q)));
      }
    } catch {
      /* optimistic update already reflected the tap */
    }
  }

  async function resolveQuestion(questionId: number, status2: "answered" | "dismissed") {
    await fetch(`/api/streams/${streamId}/qa/${questionId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status2 }),
    }).catch(() => {});
    setQaQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, status: status2 } : q)));
  }

  async function requestSpotlight() {
    if (!isLoggedIn) {
      setError("Log in to request the spotlight.");
      return;
    }
    const message = window.prompt("Want to say anything to the host? (optional)") ?? "";
    try {
      const res = await fetch(`/api/streams/${streamId}/spotlight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() || null }),
      });
      if (res.ok) setSpotlightRequested(true);
    } catch {
      /* best-effort */
    }
  }

  async function resolveSpotlight(requestId: number, status2: "spotlighted" | "dismissed") {
    await fetch(`/api/streams/${streamId}/spotlight/${requestId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status2 }),
    }).catch(() => {});
    setSpotlightRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: status2 } : r)));
  }

  // Theater mode: lock page scroll while it's open, and let Escape
  // close it (same affordance browsers use for actual fullscreen).
  useEffect(() => {
    if (!theaterMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setTheaterMode(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [theaterMode]);

  function playClip(clip: Clip) {
    setActiveClipId(clip.id);
    setPlaybackSrc(toEmbedSrc(platform, rawEmbedUrl, clip.timestampSeconds));
  }

  async function addSponsor(e: FormEvent) {
    e.preventDefault();
    if (!sponsorPickBusinessId) return;
    setHostBusy(true);
    setHostError(null);
    try {
      const res = await fetch(`/api/streams/${streamId}/sponsors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: Number(sponsorPickBusinessId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHostError(data.error || "Couldn't add that sponsor.");
        return;
      }
      setSponsors((prev) => (prev.some((s) => s.id === data.sponsor.id) ? prev : [...prev, data.sponsor]));
      setSponsorPickBusinessId("");
    } finally {
      setHostBusy(false);
    }
  }

  async function removeSponsor(sponsorId: number) {
    await fetch(`/api/streams/${streamId}/sponsors/${sponsorId}`, { method: "DELETE" }).catch(() => {});
    setSponsors((prev) => prev.filter((s) => s.id !== sponsorId));
  }

  async function addClip(e: FormEvent) {
    e.preventDefault();
    const seconds = Number(clipTimestamp);
    if (!clipLabel.trim() || !Number.isInteger(seconds) || seconds < 0) {
      setHostError("A clip needs a label and a timestamp in seconds (0 or more).");
      return;
    }
    setHostBusy(true);
    setHostError(null);
    try {
      const res = await fetch(`/api/streams/${streamId}/clips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: clipLabel.trim(), timestampSeconds: seconds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHostError(data.error || "Couldn't mark that clip.");
        return;
      }
      setClips((prev) => [...prev, data.clip].sort((a, b) => a.timestampSeconds - b.timestampSeconds));
      setClipLabel("");
      setClipTimestamp("");
    } finally {
      setHostBusy(false);
    }
  }

  async function removeClip(clipId: number) {
    await fetch(`/api/streams/${streamId}/clips/${clipId}`, { method: "DELETE" }).catch(() => {});
    setClips((prev) => prev.filter((c) => c.id !== clipId));
    if (activeClipId === clipId) {
      setActiveClipId(null);
      setPlaybackSrc(embedSrc);
    }
  }

  async function toggleLike() {
    if (!isLoggedIn) {
      setError("Log in to like this stream.");
      return;
    }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    try {
      const res = await fetch(`/api/streams/${streamId}/like`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setLiked(wasLiked);
        setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
        setError(data.error || "Couldn't update that like.");
        return;
      }
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
      setError("Couldn't reach the server.");
    }
  }

  async function sendReaction(emoji: ReactionEmoji) {
    if (!isLoggedIn) {
      setError("Log in to react.");
      return;
    }
    // Optimistic: show it immediately rather than waiting for the next poll.
    const key = `self-${Date.now()}-${Math.random()}`;
    setFloatingReactions((prev) => [...prev, { key, emoji, left: 10 + Math.random() * 80 }]);
    setTimeout(() => setFloatingReactions((prev) => prev.filter((r) => r.key !== key)), 3000);
    try {
      await fetch(`/api/streams/${streamId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    } catch {
      /* the optimistic float already showed; a dropped request isn't worth an error */
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      setError("Log in to chat.");
      return;
    }
    const trimmed = commentText.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const res = await fetch(`/api/streams/${streamId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't post that.");
        return;
      }
      setComments((prev) => [...prev, data.comment]);
      setCommentText("");
    } catch {
      setError("Couldn't reach the server.");
    }
  }

  async function goLive() {
    setError(null);
    const res = await fetch(`/api/streams/${streamId}/start`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Couldn't go live.");
      return;
    }
    router.refresh();
  }

  async function endStream() {
    setError(null);
    const res = await fetch(`/api/streams/${streamId}/end`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Couldn't end the stream.");
      return;
    }
    router.refresh();
  }

  async function loadModeration() {
    setShowModeration(true);
    const res = await fetch(`/api/streams/${streamId}/moderation`);
    const data = await res.json();
    setReports(data.reports || []);
  }

  async function resolveReport(reportId: number, resolution: "dismissed" | "comment_deleted" | "user_banned") {
    await fetch(`/api/streams/${streamId}/moderation/${reportId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution }),
    });
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    loadModeration();
  }

  async function reportComment(commentId: number) {
    const reason = window.prompt("Why are you reporting this message?");
    if (!reason || !reason.trim()) return;
    await fetch(`/api/streams/${streamId}/comments/${commentId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
  }

  async function voteOnPoll(pollId: number, optionId: number) {
    if (!isLoggedIn) {
      setError("Log in to vote.");
      return;
    }
    const res = await fetch(`/api/streams/${streamId}/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });
    const data = await res.json();
    if (res.ok && pinned?.type === "poll") {
      setPinned({ ...pinned, options: data.options, myVote: optionId });
    } else if (!res.ok) {
      setError(data.error || "Couldn't record that vote.");
    }
  }

  async function claimDrop() {
    if (!isLoggedIn || !activeDrop) {
      setError("Log in to claim this.");
      return;
    }
    setDropClaiming(true);
    try {
      const res = await fetch(`/api/streams/${streamId}/flash-drops/${activeDrop.id}/claim`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't claim that.");
        return;
      }
      setActiveDrop({ ...activeDrop, claimedByViewer: true, claimCount: activeDrop.claimCount + 1 });
      router.refresh();
    } finally {
      setDropClaiming(false);
    }
  }

  async function pinAnnouncement(e: FormEvent) {
    e.preventDefault();
    if (!announcementDraft.trim()) return;
    setHostBusy(true);
    setHostError(null);
    try {
      const res = await fetch(`/api/streams/${streamId}/announcement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: announcementDraft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHostError(data.error || "Couldn't pin that.");
        return;
      }
      setAnnouncementDraft("");
      setPinned({
        type: "announcement",
        announcement: { id: data.announcement.id, body: data.announcement.body, createdAt: new Date().toISOString() },
      });
    } finally {
      setHostBusy(false);
    }
  }

  async function createPoll(e: FormEvent) {
    e.preventDefault();
    const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || cleanOptions.length < 2) {
      setHostError("A poll needs a question and at least 2 options.");
      return;
    }
    setHostBusy(true);
    setHostError(null);
    try {
      const res = await fetch(`/api/streams/${streamId}/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: pollQuestion.trim(), options: cleanOptions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHostError(data.error || "Couldn't open that poll.");
        return;
      }
      setPinned({
        type: "poll",
        poll: { id: data.poll.id, question: data.poll.question, closedAt: null },
        options: data.options,
        myVote: null,
      });
      setPollQuestion("");
      setPollOptions(["", ""]);
    } finally {
      setHostBusy(false);
    }
  }

  async function closePoll() {
    if (pinned?.type !== "poll") return;
    setHostBusy(true);
    try {
      await fetch(`/api/streams/${streamId}/polls/${pinned.poll.id}/close`, { method: "POST" });
      setPinned(null);
    } finally {
      setHostBusy(false);
    }
  }

  async function createMilestone(e: FormEvent) {
    e.preventDefault();
    const goal = Number(milestoneGoal);
    if (!Number.isInteger(goal) || goal <= 0 || !milestoneReward.trim()) {
      setHostError("A milestone needs a positive viewer goal and a reward description.");
      return;
    }
    setHostBusy(true);
    setHostError(null);
    try {
      const res = await fetch(`/api/streams/${streamId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalValue: goal,
          rewardDescription: milestoneReward.trim(),
          dealId: milestoneDealId ? Number(milestoneDealId) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHostError(data.error || "Couldn't set that milestone.");
        return;
      }
      setMilestones((prev) => [
        ...prev,
        {
          id: data.milestone.id,
          goalValue: data.milestone.goalValue,
          rewardDescription: data.milestone.rewardDescription,
          reached: false,
          deal: milestoneDealId
            ? hostDeals.find((d) => d.id === Number(milestoneDealId))
              ? { id: Number(milestoneDealId), title: hostDeals.find((d) => d.id === Number(milestoneDealId))!.title, businessSlug: "" }
              : null
            : null,
        },
      ]);
      setMilestoneGoal("");
      setMilestoneReward("");
      setMilestoneDealId("");
    } finally {
      setHostBusy(false);
    }
  }

  async function triggerFlashDrop(e: FormEvent) {
    e.preventDefault();
    const duration = Number(dropDuration);
    if (!dropLabel.trim() || !Number.isInteger(duration) || duration < 15) {
      setHostError("A flash drop needs a label and a duration of at least 15 seconds.");
      return;
    }
    if (dropType === "deal" && !dropDealId) {
      setHostError("Pick a deal for a deal-type flash drop.");
      return;
    }
    setHostBusy(true);
    setHostError(null);
    try {
      const res = await fetch(`/api/streams/${streamId}/flash-drops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: dropType,
          label: dropLabel.trim(),
          durationSeconds: duration,
          dealId: dropType === "deal" ? Number(dropDealId) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHostError(data.error || "Couldn't trigger that flash drop.");
        return;
      }
      setActiveDrop({
        id: data.drop.id,
        type: data.drop.type,
        label: data.drop.label,
        expiresAt: data.drop.expiresAt,
        claimCount: 0,
        claimedByViewer: false,
      });
      setDropLabel("");
    } finally {
      setHostBusy(false);
    }
  }

  const nextMilestone = milestones.find((m) => !m.reached);

  return (
    <div className="pc-watch">
      <style>{`
        .pc-watch { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start; }
        .pc-watch-main, .pc-watch-side { min-width: 0; }
        .pc-watch-side { position: sticky; top: 80px; }
        .pc-watch .central-meta.item { border: 0; border-radius: 18px; box-shadow: 0 1px 6px rgba(11,42,91,0.08); background: #fff; }
        .pc-watch-main > .central-meta.item:first-of-type { border-radius: 18px; }
        .pc-watch h4 { color: #0b2a5b; font-weight: 800; }
        .pc-watch .mtr-btn.signin { border-radius: 12px; background: #f1f5fb; color: #27364d; border: 0; }
        .pc-watch .mtr-btn.signup { border-radius: 12px; }
        .pc-watch-chatlist { max-height: 440px; overflow-y: auto; margin-bottom: 12px; }
        @media (max-width: 991px) {
          .pc-watch { grid-template-columns: minmax(0, 1fr); }
          .pc-watch-side { position: static; }
          .pc-watch-chatlist { max-height: 320px; }
        }
      `}</style>
      <div className="pc-watch-main">
      {theaterMode && (
        <div
          onClick={() => setTheaterMode(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000 }}
        />
      )}

      <div className="central-meta item" style={{ overflow: "hidden" }}>
        <div
          style={
            theaterMode
              ? {
                  position: "fixed",
                  top: 64,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "92vw",
                  maxWidth: 1480,
                  height: "calc(100vh - 128px)",
                  background: "#000",
                  zIndex: 1001,
                  borderRadius: 8,
                  overflow: "hidden",
                }
              : { position: "relative", paddingBottom: "56.25%", background: "#000" }
          }
        >
          <iframe
            src={playbackSrc}
            title="Live stream"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
          />

          {/* Dynamic header/status overlay — LIVE badge + viewer count,
              always visible over the player itself. */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              display: "flex",
              gap: 8,
              zIndex: 2,
              pointerEvents: "none",
            }}
          >
            {status === "live" && (
              <span
                style={{
                  background: "#e02020",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: "bold",
                  letterSpacing: 0.5,
                  padding: "4px 10px",
                  borderRadius: 3,
                }}
              >
                ● LIVE
              </span>
            )}
            {status === "ended" && (
              <span
                style={{
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 3,
                }}
              >
                REPLAY
              </span>
            )}
          </div>
          {status === "live" && liveViewerCount !== null && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 3,
                zIndex: 2,
                pointerEvents: "none",
              }}
            >
              <i className="fa fa-eye" style={{ marginRight: 6 }} />
              {liveViewerCount} watching
            </div>
          )}

          {theaterMode && (
            <button
              type="button"
              onClick={() => setTheaterMode(false)}
              title="Exit theater mode"
              style={{
                position: "absolute",
                top: 12,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 3,
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                border: "none",
                borderRadius: 3,
                padding: "5px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              <i className="fa fa-compress" style={{ marginRight: 6 }} />
              Exit Theater Mode
            </button>
          )}

          {/* Floating reactions layer */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            {floatingReactions.map((r) => (
              <span
                key={r.key}
                className="pc-float-reaction"
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: `${r.left}%`,
                  fontSize: 28,
                }}
              >
                {REACTION_GLYPHS[r.emoji]}
              </span>
            ))}
          </div>
          <style>{`
            @keyframes pc-float-up {
              0% { transform: translateY(0); opacity: 1; }
              100% { transform: translateY(-220px); opacity: 0; }
            }
            .pc-float-reaction { animation: pc-float-up 3s ease-out forwards; }
          `}</style>
        </div>

        <div
          style={{
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div>
            {status === "ended" && initialTotalViewCount !== null && (
              <span style={{ color: "#999", fontSize: 13 }}>
                <i className="fa fa-eye" style={{ marginRight: 6 }} />
                {initialTotalViewCount} views
              </span>
            )}
          </div>

          {status === "live" && (
            <div style={{ display: "flex", gap: 4 }}>
              {(Object.keys(REACTION_GLYPHS) as ReactionEmoji[]).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReaction(emoji)}
                  title={emoji}
                  style={{
                    background: "#f7f7f7",
                    border: "1px solid #eee",
                    borderRadius: 20,
                    padding: "4px 10px",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  {REACTION_GLYPHS[emoji]}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="mtr-btn signin"
              type="button"
              onClick={() => setTheaterMode((v) => !v)}
              title="Theater mode"
            >
              <span>
                <i className={`fa ${theaterMode ? "fa-compress" : "fa-arrows-alt"}`} style={{ marginRight: 6 }} />
                Theater
              </span>
            </button>
            {isHost && status === "scheduled" && (
              <button className="mtr-btn signup" type="button" onClick={goLive}>
                <span>Go Live</span>
              </button>
            )}
            {isHost && status === "live" && (
              <button className="mtr-btn signin" type="button" onClick={endStream}>
                <span>End Stream</span>
              </button>
            )}
            {status === "live" && (
              <button className="mtr-btn signin" type="button" onClick={() => setShowQa((v) => !v)}>
                <span>
                  <i className="fa fa-question-circle" style={{ marginRight: 6 }} />
                  Q&amp;A
                </span>
              </button>
            )}
            {status === "live" && !isHost && (
              <button
                className="mtr-btn signin"
                type="button"
                disabled={spotlightRequested}
                onClick={requestSpotlight}
                title="Ask the host to feature you during the stream"
              >
                <span>
                  <i className="fa fa-star" style={{ marginRight: 6 }} />
                  {spotlightRequested ? "Requested ✓" : "Request Spotlight"}
                </span>
              </button>
            )}
            {canModerate && status === "live" && (
              <button className="mtr-btn signin" type="button" onClick={() => setShowHostTools((v) => !v)}>
                <span>Host Tools</span>
              </button>
            )}
            {canModerate && (
              <button className="mtr-btn signin" type="button" onClick={loadModeration}>
                <span>Moderation</span>
              </button>
            )}
            <button
              type="button"
              onClick={toggleLike}
              style={{
                cursor: "pointer",
                background: liked ? "#fdecea" : "#f7f7f7",
                border: "1px solid #eee",
                borderRadius: 20,
                padding: "5px 12px",
                color: liked ? "#e02020" : "#555",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <i className={liked ? "fa fa-heart" : "ti-heart"} style={{ marginRight: 6 }} />
              {likeCount}
            </button>
          </div>
        </div>

        {status === "live" && isLoggedIn && watchProgress && (
          <div style={{ padding: "0 20px 14px" }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
              {watchProgress.pointsUnlocked
                ? `+${watchProgress.pointsValue} Pueblo Points earned for watching`
                : `Watch ${Math.ceil(watchProgress.thresholdSeconds / 60)} min to earn ${watchProgress.pointsValue} Pueblo Points`}
            </div>
            <div style={{ height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, (watchProgress.elapsedSeconds / watchProgress.thresholdSeconds) * 100)}%`,
                  background: watchProgress.pointsUnlocked ? "#2a8f2a" : "#1877d1",
                  transition: "width 1s linear",
                }}
              />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" style={{ color: "#c0392b", padding: "0 20px 12px" }}>{error}</p>
        )}
      </div>

      {(sponsors.length > 0 || canModerate) && (
        <div className="central-meta item">
          <div style={{ padding: "14px 20px" }}>
            <h5 style={{ margin: "0 0 10px", color: "#888", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Featured Local Sponsors
            </h5>
            {sponsors.length === 0 && <p style={{ color: "#aaa", fontSize: 13 }}>No sponsors tagged yet.</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {sponsors.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid #eee",
                    borderRadius: 20,
                    padding: "6px 12px 6px 6px",
                  }}
                >
                  {s.businessLogoPath ? (
                    <img
                      src={s.businessLogoPath}
                      alt=""
                      style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <span
                      aria-hidden
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: avatarColor(s.businessId),
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {s.businessName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <a href={`/businesses/${s.businessSlug}`} style={{ fontSize: 13, fontWeight: 600 }}>
                    {s.businessName}
                  </a>
                  <span style={{ fontSize: 11, color: "#999" }}>{s.businessCategory}</span>
                  {canModerate && (
                    <button
                      type="button"
                      onClick={() => removeSponsor(s.id)}
                      style={{ background: "none", border: "none", color: "#bbb", cursor: "pointer", marginLeft: 2 }}
                      title="Remove sponsor"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {canModerate && (
              <form onSubmit={addSponsor} style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <select
                  value={sponsorPickBusinessId}
                  onChange={(e) => setSponsorPickBusinessId(e.target.value)}
                  className="form-control"
                  style={{ maxWidth: 260 }}
                >
                  <option value="">Add a sponsor…</option>
                  {allBusinesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.category})
                    </option>
                  ))}
                </select>
                <button className="btn btn-primary btn-sm" type="submit" disabled={hostBusy || !sponsorPickBusinessId}>
                  Add
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {(clips.length > 0 || canModerate) && status !== "scheduled" && (
        <div className="central-meta item">
          <div style={{ padding: "14px 20px" }}>
            <h5 style={{ margin: "0 0 10px", color: "#888", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Replay &amp; Highlights
            </h5>
            {clips.length === 0 && <p style={{ color: "#aaa", fontSize: 13 }}>No highlight clips marked yet.</p>}
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {clips.map((c) => (
                <div key={c.id} style={{ flexShrink: 0, textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => playClip(c)}
                    disabled={platform === "facebook"}
                    title={platform === "facebook" ? "Jumping isn't supported for Facebook videos" : "Jump to this moment"}
                    style={{
                      width: 110,
                      height: 62,
                      borderRadius: 6,
                      border: activeClipId === c.id ? "2px solid #1877d1" : "1px solid #ddd",
                      background: "linear-gradient(135deg, #2c2c2c, #000)",
                      color: "#fff",
                      cursor: platform === "facebook" ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    <i className="fa fa-play" />
                  </button>
                  <div style={{ fontSize: 11.5, marginTop: 4, width: 110 }}>
                    {c.label}
                    <div style={{ color: "#999" }}>
                      {String(Math.floor(c.timestampSeconds / 60)).padStart(2, "0")}:
                      {String(c.timestampSeconds % 60).padStart(2, "0")}
                    </div>
                  </div>
                  {canModerate && (
                    <button
                      type="button"
                      onClick={() => removeClip(c.id)}
                      style={{ background: "none", border: "none", color: "#bbb", fontSize: 11, cursor: "pointer" }}
                    >
                      remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {canModerate && (
              <form onSubmit={addClip} style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Label, e.g. Big announcement"
                  maxLength={150}
                  value={clipLabel}
                  onChange={(e) => setClipLabel(e.target.value)}
                  className="form-control"
                  style={{ maxWidth: 220 }}
                />
                <input
                  type="number"
                  placeholder="Timestamp (seconds)"
                  min={0}
                  value={clipTimestamp}
                  onChange={(e) => setClipTimestamp(e.target.value)}
                  className="form-control"
                  style={{ maxWidth: 160 }}
                />
                <button className="btn btn-primary btn-sm" type="submit" disabled={hostBusy}>
                  Mark clip
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {status === "live" && activeDrop && (
        <div className="central-meta item" style={{ background: "#fff8e6" }}>
          <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <strong>⚡ Flash Drop:</strong> {activeDrop.label}
              <div style={{ fontSize: 12, color: "#999" }}>
                {activeDrop.claimCount} claimed · ends{" "}
                {new Date(activeDrop.expiresAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
            {isLoggedIn ? (
              <button
                className="mtr-btn signup"
                type="button"
                disabled={activeDrop.claimedByViewer || dropClaiming}
                onClick={claimDrop}
              >
                <span>{activeDrop.claimedByViewer ? "Claimed ✓" : dropClaiming ? "Claiming…" : "Claim it"}</span>
              </button>
            ) : (
              <span style={{ fontSize: 13, color: "#999" }}>Log in to claim</span>
            )}
          </div>
        </div>
      )}

      {status === "live" && milestones.length > 0 && (
        <div className="central-meta item">
          <div style={{ padding: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Stream Milestones</h4>
            {milestones.map((m) => {
              const progress = liveViewerCount !== null ? Math.min(100, (liveViewerCount / m.goalValue) * 100) : 0;
              return (
                <div key={m.id} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>
                    {m.reached ? "🎉" : "🎯"} {m.rewardDescription}
                    {m.deal && (
                      <>
                        {" "}
                        —{" "}
                        <a href={`/businesses/${m.deal.businessSlug}`}>{m.deal.title}</a>
                      </>
                    )}
                    <span style={{ color: "#999", marginLeft: 6 }}>
                      ({liveViewerCount ?? 0}/{m.goalValue} viewers)
                    </span>
                  </div>
                  <div style={{ height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${progress}%`,
                        background: m.reached ? "#2a8f2a" : "#f5a623",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {canModerate && showHostTools && status === "live" && (
        <div className="central-meta item">
          <div style={{ padding: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Host Tools</h4>
            {hostError && <p role="alert" style={{ color: "#c0392b", marginBottom: 10 }}>{hostError}</p>}

            <div className="row">
              <div className="col-md-6" style={{ marginBottom: 16 }}>
                <h5 style={{ marginBottom: 6 }}>Pin an announcement</h5>
                <form onSubmit={pinAnnouncement}>
                  <input
                    type="text"
                    placeholder="e.g. We'll be visiting a local business next!"
                    maxLength={300}
                    value={announcementDraft}
                    onChange={(e) => setAnnouncementDraft(e.target.value)}
                    className="form-control"
                    style={{ marginBottom: 6 }}
                  />
                  <button className="btn btn-primary btn-sm" type="submit" disabled={hostBusy || !announcementDraft.trim()}>
                    Pin
                  </button>
                </form>
              </div>

              <div className="col-md-6" style={{ marginBottom: 16 }}>
                <h5 style={{ marginBottom: 6 }}>Open a poll</h5>
                <form onSubmit={createPoll}>
                  <input
                    type="text"
                    placeholder="Question"
                    maxLength={200}
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="form-control"
                    style={{ marginBottom: 6 }}
                  />
                  {pollOptions.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      placeholder={`Option ${i + 1}`}
                      maxLength={80}
                      value={opt}
                      onChange={(e) =>
                        setPollOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))
                      }
                      className="form-control"
                      style={{ marginBottom: 6 }}
                    />
                  ))}
                  <div style={{ display: "flex", gap: 6 }}>
                    {pollOptions.length < 6 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-default"
                        onClick={() => setPollOptions((prev) => [...prev, ""])}
                      >
                        + Option
                      </button>
                    )}
                    <button className="btn btn-primary btn-sm" type="submit" disabled={hostBusy}>
                      Open poll
                    </button>
                    {pinned?.type === "poll" && (
                      <button type="button" className="btn btn-sm btn-danger" onClick={closePoll} disabled={hostBusy}>
                        Close current poll
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="col-md-6" style={{ marginBottom: 16 }}>
                <h5 style={{ marginBottom: 6 }}>Set a milestone</h5>
                <form onSubmit={createMilestone}>
                  <input
                    type="number"
                    placeholder="Viewer goal, e.g. 100"
                    min={1}
                    value={milestoneGoal}
                    onChange={(e) => setMilestoneGoal(e.target.value)}
                    className="form-control"
                    style={{ marginBottom: 6 }}
                  />
                  <input
                    type="text"
                    placeholder="Reward, e.g. We unlock a Flash Deal!"
                    maxLength={200}
                    value={milestoneReward}
                    onChange={(e) => setMilestoneReward(e.target.value)}
                    className="form-control"
                    style={{ marginBottom: 6 }}
                  />
                  {hostDeals.length > 0 && (
                    <select
                      value={milestoneDealId}
                      onChange={(e) => setMilestoneDealId(e.target.value)}
                      className="form-control"
                      style={{ marginBottom: 6 }}
                    >
                      <option value="">No deal attached</option>
                      {hostDeals.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.businessName}: {d.title}
                        </option>
                      ))}
                    </select>
                  )}
                  <button className="btn btn-primary btn-sm" type="submit" disabled={hostBusy}>
                    Set milestone
                  </button>
                </form>
              </div>

              <div className="col-md-6" style={{ marginBottom: 16 }}>
                <h5 style={{ marginBottom: 6 }}>Trigger a flash drop</h5>
                <form onSubmit={triggerFlashDrop}>
                  <select
                    value={dropType}
                    onChange={(e) => setDropType(e.target.value as FlashDropType)}
                    className="form-control"
                    style={{ marginBottom: 6 }}
                  >
                    <option value="passport_stamp">Pueblo Passport stamp</option>
                    <option value="deal">Deal claim</option>
                  </select>
                  {dropType === "deal" && (
                    <select
                      value={dropDealId}
                      onChange={(e) => setDropDealId(e.target.value)}
                      className="form-control"
                      style={{ marginBottom: 6 }}
                    >
                      <option value="">Pick a deal…</option>
                      {hostDeals.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.businessName}: {d.title}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    placeholder="Label, e.g. First 20 viewers get a stamp!"
                    maxLength={150}
                    value={dropLabel}
                    onChange={(e) => setDropLabel(e.target.value)}
                    className="form-control"
                    style={{ marginBottom: 6 }}
                  />
                  <input
                    type="number"
                    placeholder="Duration (seconds)"
                    min={15}
                    value={dropDuration}
                    onChange={(e) => setDropDuration(e.target.value)}
                    className="form-control"
                    style={{ marginBottom: 6 }}
                  />
                  <button className="btn btn-primary btn-sm" type="submit" disabled={hostBusy}>
                    Trigger drop
                  </button>
                </form>
              </div>

              <div className="col-md-6" style={{ marginBottom: 16 }}>
                <h5 style={{ marginBottom: 6 }}>
                  Spotlight requests
                  <button
                    type="button"
                    className="btn btn-sm btn-default"
                    style={{ marginLeft: 10 }}
                    onClick={() => setShowSpotlightQueue((v) => !v)}
                  >
                    {showSpotlightQueue ? "Hide" : "Show"}
                  </button>
                </h5>
                {showSpotlightQueue && (
                  <div>
                    {spotlightRequests.filter((r) => r.status === "pending").length === 0 && (
                      <p style={{ color: "#888", fontSize: 13 }}>No pending requests.</p>
                    )}
                    {spotlightRequests
                      .filter((r) => r.status === "pending")
                      .map((r) => (
                        <div
                          key={r.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            padding: "6px 0",
                            borderBottom: "1px solid #f0f0f0",
                          }}
                        >
                          <div style={{ fontSize: 13 }}>
                            <strong>{r.userName}</strong>
                            {r.message && <div style={{ color: "#888" }}>{r.message}</div>}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => resolveSpotlight(r.id, "spotlighted")}
                            >
                              Spotlight
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-default"
                              onClick={() => resolveSpotlight(r.id, "dismissed")}
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModeration && (
        <div className="central-meta item">
          <div style={{ padding: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Open reports</h4>
            {reports.length === 0 && <p style={{ color: "#888" }}>Nothing to review.</p>}
            {reports.map((r) => (
              <div key={r.id} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
                <p style={{ margin: 0 }}>
                  <strong>{r.commentAuthorUsername}:</strong> {r.commentBody}
                </p>
                <p style={{ margin: "4px 0", color: "#999", fontSize: 13 }}>
                  Reported by {r.reporterUsername}: {r.reason}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="mtr-btn signin" type="button" onClick={() => resolveReport(r.id, "dismissed")}>
                    <span>Dismiss</span>
                  </button>
                  <button className="mtr-btn signin" type="button" onClick={() => resolveReport(r.id, "comment_deleted")}>
                    <span>Delete comment</span>
                  </button>
                  <button className="mtr-btn signup" type="button" onClick={() => resolveReport(r.id, "user_banned")}>
                    <span>Ban user</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "live" && pinned && (
        <div className="central-meta item" style={{ background: "#eef6ff" }}>
          <div style={{ padding: "14px 20px" }}>
            {pinned.type === "announcement" ? (
              <p style={{ margin: 0 }}>📌 {pinned.announcement.body}</p>
            ) : (
              <>
                <p style={{ margin: "0 0 10px", fontWeight: 600 }}>📊 {pinned.poll.question}</p>
                {pinned.options.map((o) => {
                  const total = pinned.options.reduce((sum, opt) => sum + opt.voteCount, 0);
                  const pct = total > 0 ? Math.round((o.voteCount / total) * 100) : 0;
                  const isMine = pinned.myVote === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => voteOnPoll(pinned.poll.id, o.id)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        background: isMine ? "#dbeafe" : "#fff",
                        border: "1px solid #ddd",
                        borderRadius: 4,
                        padding: "6px 10px",
                        marginBottom: 6,
                        cursor: "pointer",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: `${pct}%`,
                          background: "#c7e0ff",
                          borderRadius: 4,
                          zIndex: 0,
                        }}
                      />
                      <span style={{ position: "relative", zIndex: 1 }}>
                        {isMine ? "✓ " : ""}
                        {o.text} — {o.voteCount} ({pct}%)
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {status === "live" && showQa && (
        <div className="central-meta item">
          <div style={{ padding: 20 }}>
            <h4 style={{ marginBottom: 12 }}>
              <i className="fa fa-question-circle" style={{ marginRight: 8, color: "#1877d1" }} />
              Live Q&amp;A
            </h4>
            {qaError && <p role="alert" style={{ color: "#c0392b", marginBottom: 10 }}>{qaError}</p>}
            {qaQuestions.length === 0 && <p style={{ color: "#888" }}>No questions yet — ask the first one!</p>}
            {qaQuestions.map((q) => (
              <div
                key={q.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: "1px solid #f0f0f0",
                  opacity: q.status === "dismissed" ? 0.5 : 1,
                }}
              >
                <button
                  type="button"
                  onClick={() => voteOnQuestion(q.id)}
                  disabled={q.status !== "open"}
                  title="Upvote this question"
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: 42,
                    padding: "4px 0",
                    borderRadius: 6,
                    border: "1px solid " + (q.votedByViewer ? "#1877d1" : "#eee"),
                    background: q.votedByViewer ? "#eef6ff" : "#fff",
                    color: q.votedByViewer ? "#1877d1" : "#888",
                    cursor: q.status === "open" ? "pointer" : "default",
                  }}
                >
                  <i className="fa fa-caret-up" />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{q.voteCount}</span>
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5 }}>
                    <strong>{q.authorName}</strong>
                    {q.status === "answered" && (
                      <span style={{ color: "#2a8f2a", fontSize: 11, marginLeft: 8 }}>
                        <i className="fa fa-check-circle" /> answered
                      </span>
                    )}
                    {q.status === "dismissed" && (
                      <span style={{ color: "#999", fontSize: 11, marginLeft: 8 }}>dismissed</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13.5, color: "#333" }}>{q.body}</div>
                </div>
                {canModerate && q.status === "open" && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => resolveQuestion(q.id, "answered")}
                      className="btn btn-sm btn-default"
                    >
                      Answered
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveQuestion(q.id, "dismissed")}
                      className="btn btn-sm btn-default"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
            <form onSubmit={submitQaQuestion} style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <input
                type="text"
                value={qaDraft}
                onChange={(e) => setQaDraft(e.target.value)}
                placeholder={isLoggedIn ? "Ask the host a question…" : "Log in to ask a question"}
                disabled={!isLoggedIn}
                maxLength={300}
                style={{ flex: 1, minWidth: 0, padding: "10px 16px", border: 0, background: "#f1f5fb", borderRadius: 999 }}
              />
              <button className="mtr-btn signup" type="submit" disabled={!isLoggedIn || !qaDraft.trim()}>
                <span>Ask</span>
              </button>
            </form>
          </div>
        </div>
      )}

      </div>

      <aside className="pc-watch-side">
      <div className="central-meta item">
        <div style={{ padding: "16px 20px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h4 style={{ margin: 0 }}>{status === "live" ? "Live Chat" : "Chat"}</h4>
            {status === "live" && liveViewerCount !== null && (
              <span style={{ fontSize: 12.5, color: "#555" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#2a8f2a",
                    marginRight: 6,
                  }}
                />
                {liveViewerCount} watching
              </span>
            )}
          </div>
          <div className="pc-watch-chatlist">
            {comments.length === 0 && <p style={{ color: "#888" }}>No messages yet.</p>}
            {comments.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 10, padding: "7px 0" }}>
                {c.authorProfilePhotoPath ? (
                  <img
                    src={c.authorProfilePhotoPath}
                    alt=""
                    style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: avatarColor(c.authorId),
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {c.authorName.slice(0, 1).toUpperCase()}
                </span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div>
                    <strong style={{ fontSize: 13.5 }}>{c.authorName}</strong>
                    {c.authorBadges?.map((b) => (
                      <span
                        key={b}
                        style={{
                          fontSize: 10,
                          background: "#1877d1",
                          color: "#fff",
                          borderRadius: 3,
                          padding: "1px 5px",
                          marginLeft: 5,
                        }}
                      >
                        {b}
                      </span>
                    ))}
                    {isLoggedIn && (
                      <button
                        type="button"
                        onClick={() => reportComment(c.id)}
                        style={{
                          float: "right",
                          background: "none",
                          border: "none",
                          color: "#bbb",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        report
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: 13.5, color: "#333" }}>{c.body}</span>
                </div>
              </div>
            ))}
          </div>
          <form method="post" onSubmit={submitComment} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={isLoggedIn ? "Say something…" : "Log in to chat"}
              disabled={!isLoggedIn}
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 20 }}
            />
            <button className="mtr-btn signup" type="submit" disabled={!isLoggedIn || !commentText.trim()}>
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {upcomingStreams.length > 0 && (
        <div className="central-meta item">
          <div style={{ padding: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Upcoming Live Streams</h4>
            {upcomingStreams.map((u) => (
              <a
                key={u.id}
                href={`/live/${u.id}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #f0f0f0",
                  color: "inherit",
                }}
              >
                <span>
                  <strong>{u.title}</strong>
                  <span style={{ color: "#999", marginLeft: 8, fontSize: 13 }}>{u.hostName}</span>
                </span>
                {u.scheduledFor && (
                  <span style={{ color: "#999", fontSize: 13 }}>{new Date(u.scheduledFor).toLocaleString()}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
      </aside>
    </div>
  );
}

const AVATAR_COLORS = ["#1877d1", "#2a8f2a", "#c0392b", "#8e44ad", "#c97600", "#16a085"];
function avatarColor(authorId: number) {
  return AVATAR_COLORS[authorId % AVATAR_COLORS.length];
}
