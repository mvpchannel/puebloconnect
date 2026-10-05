"use client";
import { renderableUrl } from "@/lib/safe-url";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Answer = {
  id: number;
  userId: number;
  answerType: "text" | "video" | "audio";
  answerText: string | null;
  mediaUrl: string | null;
  createdAt: string;
  name: string;
  profilePhotoPath: string | null;
};

type MyAnswer = {
  answerType: "text" | "video" | "audio";
  answerText: string | null;
  mediaUrl: string | null;
  updatedAt: string;
} | null;

type BoothAnswerPanelProps = {
  questionId: number;
  isOpen: boolean;
  isLoggedIn: boolean;
  initialAnswers: Answer[];
  initialMyAnswer: MyAnswer;
};

// Real backend: POST /api/booth/answer (submitBoothAnswer upsert in
// src/lib/db.ts). One answer per member, editable while the question
// stays open.
export default function BoothAnswerPanel({
  questionId,
  isOpen,
  isLoggedIn,
  initialAnswers,
  initialMyAnswer,
}: BoothAnswerPanelProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState(initialAnswers);
  const [myAnswer, setMyAnswer] = useState(initialMyAnswer);
  const [answerType, setAnswerType] = useState<"text" | "video" | "audio">(
    initialMyAnswer?.answerType ?? "text"
  );
  const [answerText, setAnswerText] = useState(initialMyAnswer?.answerText ?? "");
  const [mediaUrl, setMediaUrl] = useState(initialMyAnswer?.mediaUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/booth");
      if (res.ok) {
        const data = await res.json();
        setAnswers(data.answers);
      }
    } catch {
      /* best-effort refresh */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      setError("Log in to answer this week's question.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/booth/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          answerType,
          answerText: answerType === "text" ? answerText.trim() : null,
          mediaUrl: answerType !== "text" ? mediaUrl.trim() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't submit your answer.");
        return;
      }
      setMyAnswer(data.answer);
      await refresh();
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {isOpen ? (
        <form onSubmit={submit} className="central-meta item" style={{ padding: 20, marginBottom: 20 }}>
          <h4 style={{ marginBottom: 12 }}>
            {myAnswer ? "Edit your answer" : "Share your answer"}
          </h4>
          {error && <p role="alert" style={{ color: "#e02020", marginBottom: 10 }}>{error}</p>}

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: 13 }}>How will you answer?</label>
            <select
              value={answerType}
              onChange={(e) => setAnswerType(e.target.value as "text" | "video" | "audio")}
              disabled={!isLoggedIn || busy}
            >
              <option value="text">Text</option>
              <option value="video">Video (link)</option>
              <option value="audio">Audio (link)</option>
            </select>
          </div>

          {answerType === "text" ? (
            <div style={{ marginBottom: 14 }}>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                maxLength={1000}
                rows={4}
                disabled={!isLoggedIn || busy}
                style={{ width: "100%" }}
                placeholder="Your answer…"
              />
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 13 }}>
                Link to your {answerType}
              </label>
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://…"
                disabled={!isLoggedIn || busy}
                style={{ width: "100%" }}
              />
            </div>
          )}

          {isLoggedIn ? (
            <button type="submit" className="lbutton" disabled={busy}>
              {busy ? "Submitting…" : myAnswer ? "Update answer" : "Submit answer"}
            </button>
          ) : (
            <p style={{ fontSize: 13, color: "#888" }}>Log in to answer.</p>
          )}
        </form>
      ) : (
        <div className="central-meta item" style={{ padding: 20, marginBottom: 20 }}>
          <p style={{ color: "#888", margin: 0 }}>This question is closed — check back for the next one.</p>
        </div>
      )}

      <h4 style={{ margin: "20px 0 16px" }}>Answers ({answers.length})</h4>
      {answers.length === 0 && (
        <div className="central-meta item">
          <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
            No one has answered yet — be the first!
          </div>
        </div>
      )}
      {answers.map((a) => (
        <div className="central-meta item" key={a.id} style={{ marginBottom: 12 }}>
          <div style={{ padding: "14px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{a.name}</div>
            {a.answerType === "text" ? (
              <p style={{ margin: 0 }}>{a.answerText}</p>
            ) : (
              <a href={renderableUrl(a.mediaUrl) ?? "#"} target="_blank" rel="noopener noreferrer nofollow">
                {a.answerType === "video" ? "🎥 Watch video" : "🎙 Listen to audio"}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
