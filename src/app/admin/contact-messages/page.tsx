import type { Metadata } from "next";
import { listContactMessages } from "@/lib/db";
import { formatRelativeTime } from "@/lib/time";
import StatusControl from "./StatusControl";

export const metadata: Metadata = {
  title: "Contact Messages",
};

// Real data: every message sent through the Contact page is saved (and emailed
// to the site contact address). This page lists them so staff can read them.
// Replying is done by email to the address shown; use Status to keep track of what has been handled.
export const dynamic = "force-dynamic";

export default function ContactMessagesPage() {
  const messages = listContactMessages(200);
  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 12 }}>Contact Messages</h2>
        <p style={{ color: "#555", marginBottom: 20 }}>
          Messages sent from the Contact page, newest first. To reply, email the person at the address shown.
        </p>
        {messages.length === 0 ? (
          <p style={{ color: "#888" }}>No contact messages yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Received</th>
                <th>From</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatRelativeTime(m.created_at)}</td>
                  <td>{m.name}</td>
                  <td>
                    <a href={`mailto:${m.email}`}>{m.email}</a>
                  </td>
                  <td>{m.phone || "—"}</td>
                  <td>{m.company || "—"}</td>
                  <td style={{ whiteSpace: "pre-wrap", maxWidth: 420 }}>{m.message}</td>
                  <td><StatusControl id={m.id} initial={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
