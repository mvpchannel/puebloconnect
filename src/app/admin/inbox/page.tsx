import type { Metadata } from "next";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/session";
import { listConversations } from "@/lib/db";
import AdminInboxClient from "./AdminInboxClient";

export const metadata: Metadata = {
  title: "Inbox",
};

/**
 * Ported from winku admin/inbox.html. Previously STATUS: visual port of the
 * vendor demo UI only — a hardcoded "My Friends List" of 8 invented people
 * and a single fake "Bob Frank" conversation, plus a profile-banner header
 * with fabricated follower/project counts and sample notification dropdowns.
 *
 * STATUS: real. An admin account is just a `users` row with role='admin'
 * (see src/middleware.ts, which already gates this whole route), so it has
 * real conversations in the same `messages` table the member-facing
 * /messages page reads — see src/app/(site)/messages/page.tsx and
 * MessagesClient.tsx, which AdminInboxClient mirrors. This page fetches that
 * admin's real conversations server-side with listConversations() (same
 * function the member page uses) and renders them with the admin theme's
 * own chat classes (client-list / chat-msgs / cht-bdy / chat-message —
 * confirmed styled in public/admin-assets/css/main-style.css and color.css)
 * instead of the member site's CSS, since the two stacks are loaded
 * separately per-section (src/app/(site)/layout.tsx vs src/app/admin/layout.tsx)
 * and mixing them breaks styling.
 *
 * The fake profile-banner chrome (follower/project/following counts,
 * notification-dropdown samples) is dropped rather than ported, since
 * fabricated numbers sitting next to now-real data would be dishonest; the
 * page gets a plain heading instead, matching src/app/admin/users/page.tsx.
 */
export default function Page() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;
  // middleware.ts already guarantees a non-null admin session before this
  // page renders; -1 is an unreachable fallback to satisfy the type.
  const currentUserId = session?.sub ?? -1;
  const conversations = listConversations(currentUserId).map((c) => ({
    otherUserId: c.other_user_id,
    otherName: [c.other_first_name, c.other_last_name].filter(Boolean).join(" ") || c.other_username,
    otherProfilePhotoPath: c.other_profile_photo_path,
    lastBody: c.last_body,
    unreadCount: c.unread_count,
  }));

  return (
    <div className="row">
      <div className="col-md-12">
        <div className="widget-title" style={{ marginBottom: 20 }}>
          <h3>Inbox</h3>
          <span>Real conversations for this admin account</span>
        </div>
        <AdminInboxClient currentUserId={currentUserId} initialConversations={conversations} />
      </div>
    </div>
  );
}
