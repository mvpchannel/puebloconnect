import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import NotificationsList from "@/components/NotificationsList";
import { getCurrentUser } from "@/lib/require-user";
import { listNotifications } from "@/lib/db";
import { shapeNotification } from "@/app/api/notifications/route";

export const metadata: Metadata = {
  title: "Notifications",
};

// Ported from winku-html/notifications.html (the "All Notifications" panel;
// the page's own feature-photo/timeline-info header and "who's following" /
// "recent photos" sidebars were just duplicated profile-page chrome, so
// this uses the shared Header/Footer/Sidebar the same way terms/page.tsx
// and about/page.tsx do, same visual system as the rest of the site).
// Member-only — gated in src/middleware.ts.
//
// Real backend: listNotifications/shapeNotification (same as the Header.tsx
// bell dropdown and GET /api/notifications) — rendered server-side here so
// the full history shows immediately, with NotificationsList handling the
// dismiss button and the mark-all-read-on-open call client-side.
export default async function NotificationsPage() {
  const session = await getCurrentUser();
  const notifications = session ? listNotifications(session.sub, 100).map(shapeNotification) : [];

  return (
    <>
      <Header />

      <section>
        <div className="gap2 color-bg">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="top-banner">
                  <h1>Notifications</h1>
                </div>
                <nav className="breadcrumb">
                  <Link className="breadcrumb-item" href="/">Home</Link>
                  <span className="breadcrumb-item active">Notifications</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="gap gray-bg">
          <div className="container">
            <div className="row" id="page-contents">
              <div className="col-lg-3">
                <Sidebar />
              </div>
              <div className="col-lg-9">
                <div className="central-meta">
                  <div className="editing-interest">
                    <h5 className="f-title"><i className="ti-bell" /> All Notifications</h5>
                    {!session ? (
                      <p style={{ color: "#888" }}>
                        <Link href="/login" title="">Log in</Link> to see your notifications.
                      </p>
                    ) : (
                      <NotificationsList initial={notifications} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
