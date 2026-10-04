"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type StreamSummary = {
  id: number;
  hostName: string;
  hostProfilePhotoPath: string | null;
  title: string;
  platform: string;
  status: "scheduled" | "live" | "ended";
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  likeCount: number;
  commentCount: number;
  liveViewerCount: number | null;
};

type Tab = "live" | "scheduled" | "ended";

const TAB_LABELS: Record<Tab, string> = {
  live: "Live Now",
  scheduled: "Upcoming",
  ended: "Past Streams",
};

// No thumbnail-upload pipeline exists anywhere in this app (streams
// just point at the host's own YouTube/Facebook/Vimeo broadcast), so
// every card gets a deterministic gradient instead of a fake image —
// picked from the stream id so the same stream always looks the same.
const GRADIENTS = [
  "linear-gradient(135deg, #ff6a3d, #c0392b)",
  "linear-gradient(135deg, #2a8f2a, #0f5c0f)",
  "linear-gradient(135deg, #1877d1, #0b3d75)",
  "linear-gradient(135deg, #f5a623, #c97600)",
  "linear-gradient(135deg, #8e44ad, #4a235a)",
  "linear-gradient(135deg, #16a085, #0d5c4e)",
];

const PLATFORM_ICON: Record<string, string> = {
  youtube: "fa-youtube-play",
  facebook: "fa-facebook-square",
  vimeo: "fa-vimeo-square",
};

function cardGradient(id: number) {
  return GRADIENTS[id % GRADIENTS.length];
}

export default function StreamsBrowser({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [tab, setTab] = useState<Tab>("live");
  const [streams, setStreams] = useState<StreamSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/streams?status=${tab}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setStreams(data.streams || []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <div>
      <div className="central-meta item" style={{ padding: "12px 20px" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={tab === t ? "mtr-btn signup" : "mtr-btn signin"}
            >
              <span>{TAB_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </div>

      {!isLoggedIn && (
        <div className="central-meta item" style={{ padding: 16, textAlign: "center", color: "#888" }}>
          <Link href="/login" title="">Log in</Link> to go live or schedule a stream.
        </div>
      )}

      {loading && (
        <div className="central-meta item">
          <div style={{ padding: 24, textAlign: "center", color: "#888" }}>Loading…</div>
        </div>
      )}

      {!loading && streams.length === 0 && (
        <div className="central-meta item">
          <div style={{ padding: 24, textAlign: "center", color: "#888" }}>
            {tab === "live" && "Nobody's streaming right now."}
            {tab === "scheduled" && "No upcoming streams scheduled."}
            {tab === "ended" && "No past streams yet."}
          </div>
        </div>
      )}

      {!loading && streams.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            padding: "20px 20px 4px",
          }}
        >
          {streams.map((s) => (
            <Link
              key={s.id}
              href={`/live/${s.id}`}
              title=""
              style={{
                display: "block",
                width: 300,
                borderRadius: 10,
                overflow: "hidden",
                background: "#fff",
                boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  position: "relative",
                  height: 168,
                  background: cardGradient(s.id),
                }}
              >
                {s.status === "live" && (
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      background: "#e02020",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: "bold",
                      padding: "3px 9px",
                      borderRadius: 3,
                      letterSpacing: 0.5,
                    }}
                  >
                    ● LIVE
                  </span>
                )}
                {s.status === "live" && typeof s.liveViewerCount === "number" && (
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      background: "rgba(0,0,0,0.55)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 9px",
                      borderRadius: 3,
                    }}
                  >
                    <i className="fa fa-eye" style={{ marginRight: 5 }} />
                    {s.liveViewerCount}
                  </span>
                )}
                <i
                  className={`fa ${PLATFORM_ICON[s.platform] || "fa-video-camera"}`}
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 20,
                  }}
                />
                <i
                  className="fa fa-play-circle"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 42,
                  }}
                />
              </div>
              <div style={{ padding: "12px 14px" }}>
                <h6
                  style={{
                    margin: "0 0 8px",
                    fontSize: 14,
                    lineHeight: 1.3,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {s.title}
                </h6>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img
                    src={s.hostProfilePhotoPath || "/images/defaults/default-avatar-male.jpg"}
                    alt=""
                    style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
                  />
                  <span style={{ color: "#999", fontSize: 12.5 }}>
                    {s.hostName}
                    {s.status === "scheduled" && s.scheduledFor && ` · ${new Date(s.scheduledFor).toLocaleString()}`}
                    {s.status === "ended" && ` · ${s.likeCount} likes`}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
