"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/time";
import { NOTIFICATION_TEXT, NOTIFICATION_LINK, type NotificationItem } from "@/lib/notification-text";

// Real backend: GET /api/notifications (src/app/api/notifications/route.ts),
// same data source and shared text/link mapping as the Header.tsx bell
// dropdown — this page is just the uncapped, full-history view of it.
// Opening this page also marks everything read, same as opening the bell.
export default function NotificationsList({ initial }: { initial: NotificationItem[] }) {
  const [notifications, setNotifications] = useState(initial);

  useEffect(() => {
    if (initial.some((n) => !n.read)) {
      fetch("/api/notifications", { method: "POST" }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function dismiss(id: number) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    } catch {
      /* best-effort */
    }
  }

  if (notifications.length === 0) {
    return (
      <div className="notification-box">
        <p style={{ color: "#999", padding: "20px 0", textAlign: "center" }}>
          No notifications yet — friend requests, messages, and likes/comments on your posts will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="notification-box">
      <ul>
        {notifications.map((n) => (
          <li key={n.id} style={{ opacity: n.read ? 0.65 : 1 }}>
            <figure>
              <img src={n.actor?.profilePhotoPath || "/images/defaults/default-avatar-male.jpg"} alt="" />
            </figure>
            <div className="notifi-meta">
              <p>
                <a href={NOTIFICATION_LINK[n.kind]}>{NOTIFICATION_TEXT[n.kind](n.actor?.name || "Someone")}</a>
              </p>
              <span>{formatRelativeTime(n.createdAt)}</span>
            </div>
            <i
              className="del fa fa-close"
              role="button"
              tabIndex={0}
              aria-label="Dismiss"
              onClick={() => dismiss(n.id)}
              style={{ cursor: "pointer" }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
