"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StreamCreateForm from "./StreamCreateForm";

// The red "Go Live" button in the Pueblo Live header. Logged-in members
// get the real StreamCreateForm in a modal (same POST /api/streams,
// bring-your-own-stream); logged-out visitors are sent to log in.
export default function LiveGoLiveButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const btn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    background: "#e8261e",
    color: "#fff",
    border: 0,
    borderRadius: 999,
    padding: "14px 34px",
    fontSize: 17,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(232,38,30,0.35)",
    textDecoration: "none",
  };

  return (
    <>
      {isLoggedIn ? (
        <button type="button" style={btn} onClick={() => setOpen(true)}>
          <i className="fa fa-video-camera" /> Go Live
        </button>
      ) : (
        <Link href="/login" style={btn} title="">
          <i className="fa fa-video-camera" /> Go Live
        </Link>
      )}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Go live"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,20,40,0.6)",
            zIndex: 2000,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            overflowY: "auto",
            padding: "5vh 16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 560 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#e8261e" }} />
              <h3 style={{ margin: 0, color: "#0b2a5b" }}>Go Live</h3>
            </div>
            <p style={{ color: "#6b7a90", fontSize: 13, marginBottom: 16 }}>
              Start broadcasting on YouTube Live, Facebook Live, or Vimeo Live first, then paste that
              broadcast&apos;s share link here. Pueblo Connect adds the chat, likes and Rewards around it — the
              video itself plays from your own broadcast.
            </p>
            <StreamCreateForm embedded onCancel={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
