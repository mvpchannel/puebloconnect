"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/time";
import { NOTIFICATION_TEXT, NOTIFICATION_LINK, type NotificationItem } from "@/lib/notification-text";

type SessionUser = { id: number; username: string; email: string; role: "member" | "admin" };

type SearchResult = { id: number; username: string; name: string; profilePhotoPath: string | null };

type OpenMenu = "search" | "notifications" | "messages" | "user" | null;

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
 * message badge are real — see /api/notifications and countUnreadMessages
 * in src/lib/db.ts. The search box is real too now — see /api/users/search
 * (previously reused only by the Friends "add someone" box).
 *
 * All four of these (search / notifications / messages / the avatar menu)
 * are CSS-driven dropdowns from the original vendor theme (.active toggles
 * visibility — see style.css) that only ever opened via a jQuery plugin
 * (public/js/script.js) this Next rebuild never actually loads. Until this
 * component started managing `openMenu` itself, every one of them was
 * genuinely dead: clicking the bell, the messages icon, the search icon,
 * or the avatar did nothing visible at all, no matter what real data was
 * behind them.
 */
export default function Header() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const settingAreaRef = useRef<HTMLUListElement>(null);
  const userImgRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequestIds, setSentRequestIds] = useState<number[]>([]);

  // Click-away: close whichever dropdown is open when a click lands
  // outside the search/notifications/messages/avatar cluster.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      const inSettingArea = settingAreaRef.current?.contains(target);
      const inUserImg = userImgRef.current?.contains(target);
      if (!inSettingArea && !inUserImg) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Debounced live search — same /api/users/search the Friends page's
  // "add someone" box already uses (searchUsers in db.ts), so this
  // doesn't invent a second search backend.
  useEffect(() => {
    const q = searchQuery.trim();
    // /api/users/search requires login (it's "find a member," not a
    // public directory) — skip the request entirely for a signed-out
    // visitor instead of firing it and eating a 401.
    if (q.length < 2 || !user) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setSearchResults(data.users || []);
        })
        .catch(() => {
          if (!cancelled) setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  function toggleMenu(menu: OpenMenu) {
    setOpenMenu((current) => (current === menu ? null : menu));
  }

  async function sendFriendRequest(recipientId: number) {
    try {
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      });
      if (res.ok) setSentRequestIds((prev) => [...prev, recipientId]);
    } catch {
      /* best-effort — the Friends page is the full-featured fallback */
    }
  }

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
    toggleMenu("notifications");
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
            {/* Previously href="#shoppingbag" — went nowhere. Same real
                destination as the new "Customize my page" button in the
                desktop topbar below: /account-settings#profile. */}
            <Link className="fa fa-sliders" href="/account-settings#profile" aria-label="Customize my page" />
          </span>
        </div>
        <div className="mh-head second">
          {/* STATUS: decorative on the mobile header specifically — the
              real member search lives in the desktop topbar's search
              icon (see .setting-area below). Wiring this one too means
              designing its own result-dropdown layout for the narrow
              responsive header, which hasn't been done. */}
          <form className="mh-form" role="search" onSubmit={(e) => e.preventDefault()}>
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
                <li><Link href="/about" title="">About Pueblo Connect</Link></li>
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
                <li><Link href="/account-settings" title="">Account Settings</Link></li>
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
                <li><Link href="/tonight" title="">What&apos;s Happening Tonight</Link></li>
                <li><Link href="/classifieds" title="">Pueblo Classifieds</Link></li>
                <li><Link href="/rewards" title="">Pueblo Rewards</Link></li>
                <li><Link href="/groups" title="">Groups</Link></li>
                <li><Link href="/explore-3d" title="">Explore the Pueblo in 3D</Link></li>
                <li><Link href="/membership" title="">Business Membership</Link></li>
                <li><Link href="/advertise" title="">Advertise</Link></li>
                <li><Link href="/about" title="">About Pueblo Connect</Link></li>
                <li><Link href="/terms" title="">Terms &amp; conditions</Link></li>
                <li><Link href="/sitemap-page" title="">Sitemap</Link></li>
              </ul>
            </li>
          </ul>
          <ul className="setting-area" ref={settingAreaRef}>
            {user && (
              // Real space in the header for a member (or an admin — "us")
              // to get to the controls that customize their own page:
              // name/city/avatar on /profile, via the real Edit Profile
              // section of /account-settings. Previously this same
              // destination was only reachable through the "Account
              // settings" hover-submenu above or the avatar dropdown —
              // easy to miss. This is a direct, visible link instead.
              <li style={{ verticalAlign: "middle" }}>
                <Link
                  href="/account-settings#profile"
                  title=""
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    verticalAlign: "middle",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 20,
                    background: "#088dcd",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  <i className="ti-pencil-alt" /> Customize my page
                </Link>
              </li>
            )}
            <li>
              <a
                href="#"
                title="Search"
                data-ripple=""
                onClick={(e) => {
                  e.preventDefault();
                  toggleMenu("search");
                }}
              >
                <i className="ti-search" />
              </a>
              <div className={`searched${openMenu === "search" ? " active" : ""}`}>
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                  style={{ position: "relative" }}
                >
                  <input
                    type="text"
                    placeholder="Search members"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus={openMenu === "search"}
                  />
                  <button type="submit" data-ripple="" aria-label="Submit search">
                    <i className="ti-search" />
                  </button>
                  {openMenu === "search" && searchQuery.trim().length >= 2 && (
                    <div
                      className="dropdowns active"
                      style={{ position: "absolute", left: 0, right: "auto", top: "calc(100% + 8px)", width: "100%" }}
                    >
                      {!user && (
                        <span>
                          <Link href="/login" title="">Log in</Link> to search members
                        </span>
                      )}
                      {user && searching && <span>Searching…</span>}
                      {user && !searching && searchResults.length === 0 && <span>No members found</span>}
                      {user &&
                        !searching &&
                        searchResults.map((r) => (
                          <div
                            key={r.id}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid #e1e8ed" }}
                          >
                            <img
                              src={r.profilePhotoPath || "/images/defaults/default-avatar-male.jpg"}
                              alt=""
                              style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                            />
                            <Link
                              href={`/messages?to=${r.id}`}
                              title=""
                              style={{ flex: 1, fontSize: 13, color: "#333" }}
                              onClick={() => setOpenMenu(null)}
                            >
                              {r.name}
                            </Link>
                            {sentRequestIds.includes(r.id) ? (
                              <span style={{ fontSize: 11, color: "#999" }}>Request sent</span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  sendFriendRequest(r.id);
                                }}
                                style={{ fontSize: 11, border: "none", background: "none", color: "#1f6feb", cursor: "pointer", padding: 0 }}
                              >
                                Add friend
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
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
              <div className={`dropdowns${openMenu === "notifications" ? " active" : ""}`}>
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
              <a
                href="#"
                title="Messages"
                data-ripple=""
                onClick={(e) => {
                  e.preventDefault();
                  toggleMenu("messages");
                }}
              >
                <i className="ti-comment" />
                <span>{unreadMessageCount}</span>
              </a>
              <div className={`dropdowns${openMenu === "messages" ? " active" : ""}`}>
                <span>{unreadMessageCount > 0 ? `${unreadMessageCount} unread message${unreadMessageCount === 1 ? "" : "s"}` : "No new messages"}</span>
                <Link href="/messages" title="" className="more-mesg" onClick={() => setOpenMenu(null)}>
                  view all
                </Link>
              </div>
            </li>
          </ul>
          <div className="user-img" ref={userImgRef}>
            <img
              src={
                user ? "/images/defaults/default-avatar-male.jpg" : "/images/resources/admin.jpg"
              }
              alt=""
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.preventDefault();
                toggleMenu("user");
              }}
            />
            <span className="status f-online" />
            <div className={`user-setting${openMenu === "user" ? " active" : ""}`}>
              {user ? (
                <>
                  <span style={{ display: "block", padding: "8px 15px", fontWeight: 600 }}>
                    {user.username} {user.role === "admin" && "(admin)"}
                  </span>
                  <Link href="/profile" title=""><i className="ti-user" /> view profile</Link>
                  <Link href="/account-settings#profile" title=""><i className="ti-pencil-alt" /> edit profile</Link>
                  <Link href="/account-settings" title=""><i className="ti-settings" /> account setting</Link>
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
