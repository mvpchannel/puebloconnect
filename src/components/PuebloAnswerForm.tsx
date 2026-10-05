"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function PuebloAnswerForm({
  questionId,
  existing,
}: {
  questionId: number;
  existing: { body: string; status: "pending" | "approved" | "rejected" } | null;
}) {
  const router = useRouter();
  const [text, setText] = useState(existing?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/we-asked/${questionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Couldn't save your answer.");
      else router.refresh();
    } catch {
      setError("Couldn't save your answer.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!confirm("Withdraw your answer?")) return;
    const res = await fetch(`/api/we-asked/${questionId}/answer`, { method: "DELETE" });
    if (res.ok) {
      setText("");
      router.refresh();
    } else setError("Couldn't withdraw your answer.");
  }

  const statusNote =
    existing?.status === "pending"
      ? "Your answer is waiting for review. It will appear here once approved."
      : existing?.status === "approved"
        ? "Your answer is published below. Editing it sends it back for review."
        : existing?.status === "rejected"
          ? "Your answer wasn't published. You can write a new one."
          : null;

  return (
    <form onSubmit={submit}>
      {statusNote && <p style={{ color: "#555", fontSize: 14 }}>{statusNote}</p>}
      {error && <p role="alert" style={{ color: "#c0392b" }}>{error}</p>}
      <textarea
        required
        rows={4}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Your answer"
        style={{ width: "100%", padding: "9px 12px", border: "1px solid #ddd", borderRadius: 4, marginBottom: 8 }}
      />
      <p style={{ color: "#888", fontSize: 13 }}>
        Answers are reviewed by staff before they&rsquo;re published, and selected answers may also appear in The Daily
        Pueblo. Your first name and last initial are shown.
      </p>
      <button className="mtr-btn signup" type="submit" disabled={busy}>
        <span>{busy ? "Saving…" : existing ? "Update answer" : "Submit answer"}</span>
      </button>
      {existing && (
        <button type="button" onClick={withdraw} style={{ marginLeft: 12, background: "none", border: "none", color: "#c0392b", cursor: "pointer" }}>
          Withdraw
        </button>
      )}
    </form>
  );
}
