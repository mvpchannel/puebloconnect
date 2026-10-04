"use client";

import { useState } from "react";
import Link from "next/link";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              <span>Timeline</span>
              <ul>
                <li><Link href="/profile" title="">Timeline</Link></li>
                <li><Link href="/terms" title="">Terms &amp; conditions</Link></li>
                <li><Link href="/sitemap" title="">Sitemap</Link></li>
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
                <li><Link href="/login" title="">Messages</Link></li>
              </ul>
            </li>
            <li>
              <a href="#" title="">More pages</a>
              <ul>
                <li><Link href="/terms" title="">Terms &amp; conditions</Link></li>
                <li><Link href="/sitemap" title="">Sitemap</Link></li>
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
                <Link href="/login" title="" className="more-mesg">
                  view all
                </Link>
              </div>
            </li>
          </ul>
          <div className="user-img">
            <img src="/images/resources/admin.jpg" alt="" />
            <span className="status f-online" />
            <div className="user-setting">
              <a href="#" title=""><i className="ti-user" /> view profile</a>
              <a href="#" title=""><i className="ti-pencil-alt" /> edit profile</a>
              <a href="#" title=""><i className="ti-settings" /> account setting</a>
              <a href="#" title=""><i className="ti-power-off" /> log out</a>
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
