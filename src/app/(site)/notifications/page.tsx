import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

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
// STATUS: needs backend/API — sample notifications shown for layout; no
// real notifications table exists yet.
export default function NotificationsPage() {
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
                    <div className="notification-box">
                      <ul>
                        <li>
                          <figure><img src="/images/resources/friend-avatar.jpg" alt="" /></figure>
                          <div className="notifi-meta">
                            <p>bob frank liked your post</p>
                            <span>30 minutes ago</span>
                          </div>
                          <i className="del fa fa-close" />
                        </li>
                        <li>
                          <figure><img src="/images/resources/friend-avatar2.jpg" alt="" /></figure>
                          <div className="notifi-meta">
                            <p>Sarah Hetfield commented on your photo.</p>
                            <span>1 hour ago</span>
                          </div>
                          <i className="del fa fa-close" />
                        </li>
                        <li>
                          <figure><img src="/images/resources/friend-avatar3.jpg" alt="" /></figure>
                          <div className="notifi-meta">
                            <p>Mathilda Brinker commented on your new profile status.</p>
                            <span>2 hours ago</span>
                          </div>
                          <i className="del fa fa-close" />
                        </li>
                        <li>
                          <figure><img src="/images/resources/friend-avatar4.jpg" alt="" /></figure>
                          <div className="notifi-meta">
                            <p>Green Goo Rock invited you to attend his event, Goo in Gotham Bar.</p>
                            <span>2 hours ago</span>
                          </div>
                          <i className="del fa fa-close" />
                        </li>
                        <li>
                          <figure><img src="/images/resources/friend-avatar5.jpg" alt="" /></figure>
                          <div className="notifi-meta">
                            <p>Chris Greyson liked your profile status.</p>
                            <span>1 day ago</span>
                          </div>
                          <i className="del fa fa-close" />
                        </li>
                        <li>
                          <figure><img src="/images/resources/friend-avatar6.jpg" alt="" /></figure>
                          <div className="notifi-meta">
                            <p>You and Nicholas Grissom just became friends.</p>
                            <span>2 days ago</span>
                          </div>
                          <i className="del fa fa-close" />
                        </li>
                      </ul>
                    </div>
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
