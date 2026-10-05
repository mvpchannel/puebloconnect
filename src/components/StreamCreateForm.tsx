"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

// Real backend: POST /api/streams (src/app/api/streams/route.ts). This is
// the bring-your-own-stream model confirmed in the integration-boundary
// design doc — embedUrl is wherever the host is already broadcasting on
// YouTube/Facebook/Vimeo Live; Pueblo Connect never runs its own video
// server, it just stores that URL and the chat/likes/moderation around it.
export default function StreamCreateForm({
  embedded = false,
  onCancel,
}: {
  // embedded: rendered inside the Go Live modal on /live — always open,
  // no card wrapper, Cancel closes the modal.
  embedded?: boolean;
  onCancel?: () => void;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(embedded);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<"youtube" | "facebook" | "vimeo">("youtube");
  const [embedUrl, setEmbedUrl] = useState("");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          platform,
          embedUrl: embedUrl.trim(),
          goLive: when === "now",
          scheduledFor: when === "later" ? scheduledFor || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create that stream.");
        return;
      }
      router.push(`/live/${data.stream.id}`);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (!open && !embedded) {
    return (
      <div className="central-meta item" style={{ textAlign: "center", padding: 20 }}>
        <button className="mtr-btn signup" type="button" onClick={() => setOpen(true)}>
          <span>Go Live or Schedule a Stream</span>
        </button>
      </div>
    );
  }

  return (
    <div className={embedded ? undefined : "central-meta item"}>
      <div style={{ padding: embedded ? 0 : 20 }}>
        {!embedded && <h4 style={{ marginBottom: 12 }}>Go live</h4>}
        <p style={{ color: "#888", marginBottom: 12, fontSize: 13 }}>
          Start broadcasting on YouTube Live, Facebook Live, or Vimeo Live first, then paste that
          broadcast&apos;s share/embed link here — Pueblo Connect shows your stream, chat, and
          likes, but the video itself plays from your own broadcast.
        </p>
        <form method="post" onSubmit={handleSubmit}>
          {error && (
            <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
              {error}
            </p>
          )}
          <div className="form-group">
            <input
              type="text"
              id="stream-title"
              required
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <label className="control-label" htmlFor="stream-title">Title</label>
            <i className="mtrl-select" />
          </div>
          <div className="form-group">
            <textarea
              id="stream-description"
              rows={2}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this stream about? (optional)"
            />
          </div>
          <div className="form-group">
            <label style={{ display: "block", marginBottom: 6 }}>Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as typeof platform)}
              style={{ padding: "6px 10px" }}
            >
              <option value="youtube">YouTube Live</option>
              <option value="facebook">Facebook Live</option>
              <option value="vimeo">Vimeo Live</option>
            </select>
          </div>
          <div className="form-group">
            <input
              type="url"
              id="stream-embed-url"
              required
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="https://..."
            />
            <label className="control-label" htmlFor="stream-embed-url">Broadcast / embed URL</label>
            <i className="mtrl-select" />
          </div>
          <div className="form-group">
            <label style={{ display: "block", marginBottom: 6 }}>When</label>
            <label style={{ marginRight: 16 }}>
              <input
                type="radio"
                name="when"
                checked={when === "now"}
                onChange={() => setWhen("now")}
              />{" "}
              Go live now
            </label>
            <label>
              <input
                type="radio"
                name="when"
                checked={when === "later"}
                onChange={() => setWhen("later")}
              />{" "}
              Schedule for later
            </label>
          </div>
          {when === "later" && (
            <div className="form-group">
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </div>
          )}
          <div className="submit-btns">
            <button className="mtr-btn signup" type="submit" disabled={busy || !title.trim() || !embedUrl.trim()}>
              <span>{busy ? "Saving…" : when === "now" ? "Go Live" : "Schedule"}</span>
            </button>
            <button className="mtr-btn signin" type="button" onClick={() => (embedded && onCancel ? onCancel() : setOpen(false))}>
              <span>Cancel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
