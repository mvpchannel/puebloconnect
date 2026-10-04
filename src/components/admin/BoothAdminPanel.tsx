"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: number;
  questionText: string;
  opensAt: string;
  closesAt: string | null;
  isOpen: boolean;
  answerCount: number;
};

type BoothAdminPanelProps = {
  initialQuestions: Question[];
};

// Admin management for The Pueblo Booth: open new weekly questions,
// manually close one. Real backend: /api/admin/booth/questions(/:id/close).
export default function BoothAdminPanel({ initialQuestions }: BoothAdminPanelProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [questionText, setQuestionText] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/admin/booth/questions");
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions);
      }
    } catch {
      /* best-effort refresh */
    }
  }

  async function addQuestion(e: FormEvent) {
    e.preventDefault();
    if (!questionText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/booth/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: questionText.trim(),
          closesAt: closesAt ? new Date(closesAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't open that question.");
        return;
      }
      setQuestionText("");
      setClosesAt("");
      await refresh();
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function close(questionId: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/booth/questions/${questionId}/close`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't close that question.");
        return;
      }
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
      {error && (
        <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
          {error}
        </p>
      )}

      <form onSubmit={addQuestion} style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="e.g. What's your favorite Pueblo spot?"
          maxLength={300}
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          className="form-control"
          style={{ marginBottom: 6, maxWidth: 400 }}
        />
        <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
          Closes (optional — leave blank and close manually)
        </label>
        <input
          type="datetime-local"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          className="form-control"
          style={{ marginBottom: 6, maxWidth: 300 }}
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !questionText.trim()}>
          Open new question
        </button>
      </form>

      <h5 style={{ marginBottom: 8 }}>Questions</h5>
      <ul>
        {questions.length === 0 && <li style={{ color: "#888" }}>No questions yet.</li>}
        {questions.map((q) => (
          <li key={q.id} style={{ marginBottom: 8 }}>
            {q.questionText} — {q.isOpen ? "open" : "closed"} · {q.answerCount} answer
            {q.answerCount === 1 ? "" : "s"}
            {q.isOpen && (
              <button
                className="btn btn-sm btn-danger"
                type="button"
                disabled={busy}
                onClick={() => close(q.id)}
                style={{ marginLeft: 8, padding: "1px 8px" }}
              >
                Close
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
