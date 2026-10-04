"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/time";
import { NOTIFICATION_TEXT, NOTIFICATION_LINK, type NotificationItem } from "@/lib/notification-text";

type SessionUser = { id: number; username: string; email: string; role: "member" | "admin" };

/**
 * Shared site header: mobile responsive-header + desktop topbar.
 *
 * Ported from the markup that used to be duplicated at the top of all 63
 * winku-html pages. The mega-menu has been trimmed down to Pueblo Connect's
 * real sections (the original template menu also listed demo-only pages
 * like "Home Social 2" / "Home Company" / "404 error page" — dropped here;
 * see MIGRATION_STATUS.md).
 *
 * STATUS: navigation links work (real routes). The notification bell and
 * message badge are real now — see /api/notifications and
 * countUnreadMessages in src/lib/db.ts. The search box is still a static
 * placeholder — no site-wide search exists yet.
 */
export default function Header() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setUnreadMessageCount(data.unreadMessageCount ?? 0);
        setUnreadNotificationCount(data.unreadNotificationCount ?? 0);
        if (data.user) {
          fetch("/api/notifications")
            .then((r) => r.json())
            .then((nd) => {
              if (!cancelled) setNotifications(nd.notifications || []);
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        /* STATUS: if this fails, the header just shows the logged-out state. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Mark everything read the first time the member actually opens the
  // bell dropdown — not on page load, so the badge count is still
  // meaningful if they never open it.
  async function handleBellOpen() {
    if (unreadNotificationCount === 0) return;
    setUnreadNotificationCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications", { method: "POST" });
    } catch {
      /* best-effort — a failed mark-read just means the badge may reappear next load */
    }
  }

  async function dismissNotification(id: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    } catch {
      /* best-effort */
    }
  }

  async function handleLogout(e: React.MouseEvent) {
    e.preventDefault();
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* ---------- Mobile responsive header ---------- */}
      <div className="responsive-header">
        <div className="mh-head first Sticky">
          <span className="mh-btns-left">
            <a
              href="#menu"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen((open) => !open);
              }}
            >
              <i className="fa fa-align-justify" />
            </a>
          </span>
          <span className="mh-text">
            <Link href="/newsfeed" title="">
              <img src="/images/logo2.png" alt="Pueblo Connect" />
            </Link>
          </span>
          <span className="mh-btns-right">
            <a className="fa fa-sliders" href="#shoppingbag" aria-label="Settings" />
          </span>
        </div>
        <div className="mh-head second">
          <form className="mh-form" role="search">
            <input placeholder="search" />
            <a href="#/" className="fa fa-search" aria-label="Search" />
          </form>
        </div>
        <nav id="menu" className={`res-menu${mobileMenuOpen ? " active" : ""}`}>
          <ul>
            <li>
              <span>Home</span>
              <ul>
                <li><Link href="/newsfeed" title="">Newsfeed</Link></li>
                <li><Link href="/login" title="">Login page</Link></li>
              </ul>
            </li>
            <li>
              <span>Explore the Pueblo in 3D</span>
              <ul>
                <li><Link href="/explore-3d" title="">Explore in 3D</Link></li>
              </ul>
            </li>
            <li>
              <span>Timeline</span>
              <ul>
                <li><Link href="/profile" title="">Timeline</Link></li>
                <li><Link href="/terms" title="">Terms &amp; conditions</Link></li>
                <li><Link href="/sitemap-page" title="">Sitemap</Link></li>
              </ul>
            </li>
          </ul>
        </nav>
      </div>

      {/* ---------- Desktop topbar ---------- */}
      <div className="topbar stick">
        <div className="logo">
          <Link title="" href="/newsfeed">
            <img src="/images/logo.png" alt="Pueblo Connect" />
          </Link>
        </div>

        <div className="top-area">
          <ul className="main-menu">
            <li>
              <a href="#" title="">Home</a>
              <ul>
                <li><Link href="/newsfeed" title="">Newsfeed</Link></li>
                <li><Link href="/login" title="">Login page</Link></li>
              </ul>
            </li>
            <li>
              <a href="#" title="">Timeline</a>
              <ul>
                <li><Link href="/profile" title="">Timeline</Link></li>
              </ul>
            </li>
            <li>
              <a href="#" title="">Account settings</a>
              <ul>
                <li><Link href="/messages" title="">Messages</Link></li>
              </ul>
            </li>
            <li>
              <a href="#" title="">More pages</a>
              <ul>
                <li><Link href="/live" title="">Pueblo Live</Link></li>
                <li><Link href="/businesses" title="">Business Channels</Link></li>
                <li><Link href="/events" title="">Events</Link></li>
                <li><Link href="/deals" title="">Pueblo Deals</Link></li>
                <li><Link href="/best-of" title="">Best of the Pueblo</Link></li>
                <li><Link href="/reports" title="">Report &amp; Track</Link></li>
                <li><Link href="/street-team" title="">Pueblo Street Team</Link></li>
                <li><Link href="/booth" title="">The Pueblo Booth</Link></li>
                <li><Link href="/passport" title="">Pueblo Passport</Link></li>
                <li><Link href="/rewards" title="">Pueblo Rewards</Link></li>
                <li><Link href="/groups" title="">Groups</Link></li>
                <li><Link href="/explore-3d" title="">Explore the Pueblo in 3D</Link></li>
                <li><Link href="/membership" title="">Business Membership</Link></li>
                <li><Link href="/advertise" title="">Advertise</Link></li>
                <li><Link href="/terms" title="">Terms &amp; conditions</Link></li>
                <li><Link href="/sitemap-page" title="">Sitemap</Link></li>
              </ul>
            </li>
          </ul>
          <ul className="setting-area">
            <li>
              <a href="#" title="Search" data-ripple="">
                <i className="ti-search" />
              </a>
              <div className="searched">
                <form method="post" className="form-search">
                  <input type="text" placeholder="Search Friend" />
                  <button type="submit" data-ripple="" aria-label="Submit search">
                    <i className="ti-search" />
                  </button>
                </form>
              </div>
            </li>
            <li>
              <Link href="/newsfeed" title="Home" data-ripple="">
                <i className="ti-home" />
              </Link>
            </li>
            <li>
              <a href="#" title="Notifications" data-ripple="" onClick={(e) => { e.preventDefault(); handleBellOpen(); }}>
                <i className="ti-bell" />
                <span>{unreadNotificationCount}</span>
              </a>
              <div className="dropdowns">
                {notifications.length === 0 && <span>No new notifications</span>}
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={NOTIFICATION_LINK[n.kind]}
                    title=""
                    style={{ display: "flex", alignItems: "center", gap: 8, opacity: n.read ? 0.6 : 1 }}
                  >
                    <img
                      src={n.actor?.profilePhotoPath || "/images/defaults/default-avatar-male.jpg"}
                      alt=""
                      style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                    <span style={{ flex: 1, fontSize: 13 }}>
                      {NOTIFICATION_TEXT[n.kind](n.actor?.name || "Someone")}
                      <br />
                      <span style={{ color: "#999", fontSize: 11 }}>{formatRelativeTime(n.createdAt)}</span>
                    </span>
                    <i
                      className="fa fa-times"
                      style={{ color: "#ccc", fontSize: 11 }}
                      role="button"
                      tabIndex={0}
                      aria-label="Dismiss"
                      onClick={(e) => dismissNotification(n.id, e)}
                    />
                  </Link>
                ))}
                <Link href="/notifications" title="" className="more-mesg">
                  view all
                </Link>
              </div>
            </li>
            <li>
              <Link href="/messages" title="Messages" data-ripple="">
                <i className="ti-comment" />
                <span>{unreadMessageCount}</span>
              </Link>
              <div className="dropdowns">
                <span>{unreadMessageCount > 0 ? `${unreadMessageCount} unread message${unreadMessageCount === 1 ? "" : "s"}` : "No new messages"}</span>
                <Link href="/messages" title="" className="more-mesg">
                  view all
                </Link>
              </div>
            </li>
          </ul>
          <div className="user-img">
            <img
              src={
                user ? "/images/defaults/default-avatar-male.jpg" : "/images/resources/admin.jpg"
              }
              alt=""
            />
            <span className="status f-online" />
            <div className="user-setting">
              {user ? (
                <>
                  <span style={{ display: "block", padding: "8px 15px", fontWeight: 600 }}>
                    {user.username} {user.role === "admin" && "(admin)"}
                  </span>
                  <Link href="/profile" title=""><i className="ti-user" /> view profile</Link>
                  {/* STATUS: needs backend/API — edit-profile and account-settings pages
                      don't exist in this app yet (still static-only in the Phase 0 site). */}
                  <a href="#" title=""><i className="ti-pencil-alt" /> edit profile</a>
                  <a href="#" title=""><i className="ti-settings" /> account setting</a>
                  {user.role === "admin" && (
                    <Link href="/admin" title=""><i className="ti-shield" /> admin</Link>
                  )}
                  <a href="#" title="" onClick={handleLogout}>
                    <i className="ti-power-off" /> log out
                  </a>
                </>
              ) : (
                <Link href="/login" title=""><i className="ti-power-off" /> log in</Link>
              )}
            </div>
          </div>
          <span
            className="ti-menu main-menu"
            data-ripple=""
            role="button"
            tabIndex={0}
            aria-label="Open menu"
          />
        </div>
      </div>
    </>
  );
}
