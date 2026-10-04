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
};

type Tab = "live" | "scheduled" | "ended";

const TAB_LABELS: Record<Tab, string> = {
  live: "Live Now",
  scheduled: "Upcoming",
  ended: "Past Streams",
};

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

      {streams.map((s) => (
        <div className="central-meta item" key={s.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}>
            <img
              src={s.hostProfilePhotoPath || "/images/defaults/default-avatar-male.jpg"}
              alt=""
              style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
            />
            <div style={{ flex: 1 }}>
              <h5 style={{ margin: 0 }}>
                <Link href={`/live/${s.id}`} title="">{s.title}</Link>
                {s.status === "live" && (
                  <span
                    style={{
                      marginLeft: 10,
                      background: "#e02020",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: "bold",
                      padding: "2px 8px",
                      borderRadius: 3,
                      verticalAlign: "middle",
                    }}
                  >
                    LIVE
                  </span>
                )}
              </h5>
              <span style={{ color: "#999", fontSize: 13 }}>
                {s.hostName} · {s.platform}
                {s.status === "scheduled" && s.scheduledFor && ` · ${new Date(s.scheduledFor).toLocaleString()}`}
                {s.status === "ended" && ` · ${s.likeCount} likes · ${s.commentCount} comments`}
              </span>
            </div>
            <Link className="mtr-btn signin" href={`/live/${s.id}`} title="">
              <span>{s.status === "live" ? "Watch" : s.status === "ended" ? "View" : "Details"}</span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
