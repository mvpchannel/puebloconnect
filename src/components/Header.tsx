"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
 * STATUS: navigation links work (real routes). The search box, notification
 * bell, and message dropdowns still show static placeholder data — no
 * backend wired up yet. See /FUNCTIONALITY_STATUS.md in the Phase 0 static
 * site for the full feature-by-feature breakdown (same gaps apply here).
 */
export default function Header() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        /* STATUS: if this fails, the header just shows the logged-out state. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
              <a href="#" title="Notifications" data-ripple="">
                <i className="ti-bell" />
                <span>0</span>
              </a>
              {/* STATUS: needs backend/API — static placeholder, no real notifications yet. */}
              <div className="dropdowns">
                <span>No new notifications</span>
                <Link href="/notifications" title="" className="more-mesg">
                  view all
                </Link>
              </div>
            </li>
            <li>
              <a href="#" title="Messages" data-ripple="">
                <i className="ti-comment" />
                <span>0</span>
              </a>
              {/* STATUS: needs backend/API — static placeholder, no real messages yet. */}
              <div className="dropdowns">
                <span>No new messages</span>
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
