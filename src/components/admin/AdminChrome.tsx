"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SessionUser = { id: number; username: string; email: string; role: "member" | "admin" };

const NAV_LINKS: { href: string; label: string; icon: string }[] = [
  { href: "/admin", label: "Dashboard", icon: "fa-dashboard" },
  { href: "/admin/connect", label: "connect", icon: "fa-bolt" },
  { href: "/admin/edit-profile", label: "edit profile", icon: "fa-flask" },
  { href: "/admin/inbox", label: "inbox", icon: "fa-flask" },
];

const EXTRAS_LINKS: { href: string; label: string }[] = [
  { href: "/admin/calendar", label: "calendar" },
  { href: "/admin/image-cropper", label: "image croper" },
  { href: "/admin/link-posting", label: "Link posting" },
  { href: "/admin/notifications", label: "notifications" },
  { href: "/admin/image-opener", label: "image opener" },
  { href: "/admin/tickets-1", label: "ticket style 1" },
  { href: "/admin/tickets-2", label: "ticket style 2" },
  { href: "/admin/reviews", label: "reviews" },
];

const MORE_LINKS: { href: string; label: string; icon: string }[] = [
  { href: "/admin/locations", label: "location system", icon: "fa-inbox" },
  { href: "/admin/posting-panel", label: "editable panel", icon: "fa-hdd-o" },
  { href: "/admin/post-preview", label: "post preview page", icon: "fa-glass" },
  { href: "/admin/users", label: "user management", icon: "fa-hdd-o" },
  { href: "/admin/stream-moderation", label: "stream moderation", icon: "fa-flag" },
  { href: "/admin/best-of", label: "best of the pueblo", icon: "fa-trophy" },
  { href: "/admin/street-team", label: "street team review", icon: "fa-camera" },
  { href: "/admin/booth", label: "the pueblo booth", icon: "fa-microphone" },
  { href: "/admin/spotlights", label: "business spotlight", icon: "fa-star" },
];

/**
 * Shared admin-panel chrome: top bar + collapsible sidebar, ported from the
 * markup duplicated across all 16 winku admin/*.html pages.
 *
 * STATUS: real — the username/role shown and the log-out button are wired
 * to the actual session (src/app/api/auth/session, .../logout), same as
 * the member site's Header.tsx. The top-bar's fullscreen/refresh/
 * right-menu icons and the "mailbox 05" badge are decorative, inherited
 * from the vendor admin theme — not wired to anything real, marked below.
 *
 * Every page reachable through this chrome is already protected by
 * src/middleware.ts (role: admin required) before it ever renders.
 */
export default function AdminChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(true);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout(e: React.MouseEvent) {
    e.preventDefault();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="panel-layout">
      <div className="top-bar">
        <div className="logo">
          <Link href="/admin" title="">
            <img src="/images/logo.png" alt="Pueblo Connect" />
          </Link>
        </div>
        <div className="menu-options">
          <span
            className="menu-action"
            role="button"
            tabIndex={0}
            aria-label={menuOpen ? "Collapse menu" : "Expand menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <i />
          </span>
        </div>
        <div className="quick-links">
          <ul>
            <li>
              <span style={{ padding: "0 10px", fontWeight: 600 }}>
                {user ? `${user.username} (${user.role})` : "…"}
              </span>
            </li>
            {/* STATUS: decorative — fullscreen/refresh/right-menu toggles from the
                vendor theme aren't wired to anything (no JS re-implemented for
                them; see (site) Header.tsx for the same kind of call on the
                member side). */}
            <li>
              <a href="#" title="" onClick={handleLogout}>
                <i className="fa fa-sign-out" /> Log out
              </a>
            </li>
          </ul>
        </div>
        <form className="search-form" onSubmit={(e) => e.preventDefault()}>
          {/* STATUS: needs backend/API — no admin-wide search exists yet. */}
          <input type="text" placeholder="Search Here..." disabled />
          <button type="submit" disabled>
            <i className="fa fa-search" />
          </button>
        </form>
      </div>

      <header className={`side-header${menuOpen ? " opened-menu" : ""}`}>
        <div className="admin-details">
          <span>
            <img src="/admin-assets/images/resource/admin.jpg" alt="" />
          </span>
          <h3>{user?.username ?? "Admin"}</h3>
          <i>{user?.role === "admin" ? "Administrator" : ""}</i>
          <h5 className="admin-status online">Online</h5>
        </div>
        <div className="menu-scroll">
          <div className="side-menus">
            <span>MAIN LINKS</span>
            <nav>
              <ul>
                {NAV_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} title="">
                      <i className={`fa ${l.icon}`} /> {l.label}
                    </Link>
                  </li>
                ))}
                <li className={`menu-item-has-children${extrasOpen ? " active" : ""}`}>
                  <a
                    href="#"
                    title=""
                    onClick={(e) => {
                      e.preventDefault();
                      setExtrasOpen((v) => !v);
                    }}
                  >
                    <i className="fa fa-flask" /> Extras
                  </a>
                  <ul style={{ display: extrasOpen ? "block" : "none" }}>
                    {EXTRAS_LINKS.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} title="">
                          <i className="fa fa-inbox" /> {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
                {MORE_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} title="">
                      <i className={`fa ${l.icon}`} /> {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <div className="panel-content">{children}</div>
    </div>
  );
}
