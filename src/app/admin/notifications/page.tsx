import type { Metadata } from "next";
import Link from "next/link";
import { listAnnouncements } from "@/lib/db";
import { formatRelativeTime } from "@/lib/time";
import AnnouncementForm from "./AnnouncementForm";
import RecallButton from "./RecallButton";

export const metadata: Metadata = {
  title: "Notifications",
};

// Real tool: staff send a short announcement that shows up in every active member's
// notification bell and Notifications page, and can take it back. Members still get
// their normal automatic notifications (friend requests, comments, likes, live streams).
export const dynamic = "force-dynamic";

export default function NotificationsAdminPage() {
  const sent = listAnnouncements(30);
  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 12 }}>Notifications</h2>
        <p style={{ color: "#555", marginBottom: 18 }}>
          Send a short announcement to every active member. It appears in their notification bell and on their{" "}
          <Link href="/notifications">Notifications page</Link>, with the Pueblo Connect logo. It is in-app only; no
          email is sent. Members&rsquo; automatic notifications (friend requests, comments, likes, live streams)
          keep working as before.
        </p>
        <AnnouncementForm />
        <h4 style={{ marginBottom: 10 }}>Sent announcements</h4>
        {sent.length === 0 ? (
          <p style={{ color: "#888" }}>Nothing sent yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Sent</th>
                <th>Message</th>
                <th>Reached</th>
                <th>Opened</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sent.map((a) => (
                <tr key={a.batch}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatRelativeTime(a.sent_at)}</td>
                  <td style={{ whiteSpace: "pre-wrap", maxWidth: 460 }}>{a.message}</td>
                  <td>{a.recipients}</td>
                  <td>{a.read_count}</td>
                  <td><RecallButton batch={a.batch} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ color: "#888", fontSize: 12 }}>
          &ldquo;Reached&rdquo; counts members who still have it; a member who dismisses it is no longer counted.
        </p>
      </div>
    </div>
  );
}
