"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Answer = { id: number; body: string; author: string; status: "pending" | "approved" | "rejected"; selected: boolean };
type Question = {
  id: number;
  slug: string;
  question: string;
  context: string;
  status: "draft" | "open" | "closed";
  answers: Answer[];
};

export default function WeAskedAdminPanel({ questions }: { questions: Question[] }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [status, setStatus] = useState<"draft" | "open">("open");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(url: string, method: string, body?: unknown): Promise<boolean> {
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "That didn't work.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("That didn't work.");
      return false;
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (await call("/api/admin/we-asked", "POST", { question, context, status })) {
      setQuestion("");
      setContext("");
    }
    setBusy(false);
  }

  const setQStatus = (q: Question, s: "draft" | "open" | "closed") =>
    call(`/api/admin/we-asked/${q.id}`, "PUT", { question: q.question, context: q.context, status: s });

  return (
    <>
      {error && <p role="alert" style={{ color: "#c0392b" }}>{error}</p>}
      <form onSubmit={create} style={{ marginBottom: 28, maxWidth: 620 }}>
        <div className="form-group">
          <label>Question</label>
          <input className="form-control" required maxLength={200} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What's the best way to spend a Saturday in the Pueblo?" />
        </div>
        <div className="form-group">
          <label>Extra context (optional)</label>
          <textarea className="form-control" rows={2} maxLength={1000} value={context} onChange={(e) => setContext(e.target.value)} />
        </div>
        <div className="form-group">
          <label>
            <input type="radio" checked={status === "open"} onChange={() => setStatus("open")} /> Open now
          </label>{" "}
          <label>
            <input type="radio" checked={status === "draft"} onChange={() => setStatus("draft")} /> Save as draft
          </label>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>Post question</button>
      </form>

      {questions.length === 0 && <p style={{ color: "#888" }}>No questions yet.</p>}
      {questions.map((q) => {
        const pending = q.answers.filter((a) => a.status === "pending").length;
        return (
          <div key={q.id} style={{ border: "1px solid #e3e3e3", borderRadius: 6, padding: 16, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <strong>{q.question}</strong>
                <div style={{ fontSize: 12, color: "#888" }}>
                  {q.status.toUpperCase()} · {q.answers.length} answers{pending > 0 && ` · ${pending} waiting for review`}
                  {q.status !== "draft" && <> · <a href={`/we-asked/${q.slug}`} target="_blank" rel="noreferrer">view page</a></>}
                </div>
              </div>
              <div style={{ whiteSpace: "nowrap" }}>
                {q.status !== "open" && <button className="btn btn-default btn-sm" onClick={() => setQStatus(q, "open")}>Open</button>}{" "}
                {q.status === "open" && <button className="btn btn-default btn-sm" onClick={() => setQStatus(q, "closed")}>Close</button>}{" "}
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => confirm("Delete this question and hide its answers?") && call(`/api/admin/we-asked/${q.id}`, "DELETE")}
                >
                  Delete
                </button>
              </div>
            </div>
            {q.answers.map((a) => (
              <div key={a.id} style={{ borderTop: "1px solid #eee", marginTop: 10, paddingTop: 10 }}>
                <div style={{ whiteSpace: "pre-wrap" }}>{a.body}</div>
                <div style={{ fontSize: 12, color: "#888", margin: "4px 0 6px" }}>
                  {a.author} · {a.status}{a.selected && " · selected for The Daily Pueblo"}
                </div>
                {a.status !== "approved" && (
                  <button className="btn btn-success btn-sm" onClick={() => call(`/api/admin/we-asked/answers/${a.id}`, "PUT", { status: "approved" })}>Approve</button>
                )}{" "}
                {a.status !== "rejected" && (
                  <button className="btn btn-default btn-sm" onClick={() => call(`/api/admin/we-asked/answers/${a.id}`, "PUT", { status: "rejected" })}>Reject</button>
                )}{" "}
                {a.status === "approved" && (
                  <button className="btn btn-default btn-sm" onClick={() => call(`/api/admin/we-asked/answers/${a.id}`, "PUT", { selected: !a.selected })}>
                    {a.selected ? "Unselect" : "Select for The Daily Pueblo"}
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
