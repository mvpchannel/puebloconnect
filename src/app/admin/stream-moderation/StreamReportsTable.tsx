"use client";

import { useState } from "react";
import Link from "next/link";

export type AdminStreamReport = {
  id: number;
  streamId: number;
  streamTitle: string;
  commentId: number;
  commentBody: string;
  commentAuthorId: number;
  commentAuthorUsername: string;
  reporterId: number;
  reporterUsername: string;
  reason: string;
  createdAt: string;
};

/**
 * Site-wide stream-moderation queue — every open comment report across
 * every stream, in one table, instead of an admin having to open each
 * stream's own page to find reports on it. Resolving a report here calls
 * the same endpoint the stream's own moderation panel uses
 * (POST /api/streams/:id/moderation/:reportId, src/lib/db.ts
 * resolveCommentReport), which already accepts an admin on any stream, not
 * just that stream's host.
 */
export default function StreamReportsTable({ initialReports }: { initialReports: AdminStreamReport[] }) {
  const [reports, setReports] = useState(initialReports);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(report: AdminStreamReport, resolution: "dismissed" | "comment_deleted" | "user_banned") {
    setError(null);
    setBusyId(report.id);
    try {
      const res = await fetch(`/api/streams/${report.streamId}/moderation/${report.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't resolve that report.");
        return;
      }
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  if (reports.length === 0) {
    return <p style={{ color: "#888" }}>No open reports — the queue is clear.</p>;
  }

  return (
    <div>
      {error && (
        <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
          {error}
        </p>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Stream</th>
            <th>Comment</th>
            <th>Reported by</th>
            <th>Reason</th>
            <th>Reported</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => {
            const busy = busyId === r.id;
            return (
              <tr key={r.id}>
                <td>
                  <Link href={`/live/${r.streamId}`} title="">{r.streamTitle}</Link>
                </td>
                <td>
                  <strong>{r.commentAuthorUsername}:</strong> {r.commentBody}
                </td>
                <td>{r.reporterUsername}</td>
                <td>{r.reason}</td>
                <td>{r.createdAt}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    className="btn btn-sm btn-secondary"
                    disabled={busy}
                    onClick={() => resolve(r, "dismissed")}
                  >
                    Dismiss
                  </button>{" "}
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={busy}
                    onClick={() => resolve(r, "comment_deleted")}
                  >
                    Delete comment
                  </button>{" "}
                  <button
                    className="btn btn-sm btn-danger"
                    disabled={busy}
                    onClick={() => resolve(r, "user_banned")}
                  >
                    Ban user
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
