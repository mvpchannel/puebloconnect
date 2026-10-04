import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "About",
};

// Ported from winku-html/about.html. The original vendor page is really a
// demo "profile" page with its "about" tab selected (fake work/education at
// "Envato", football/photography interests, Oxford/Harvard degrees, a fake
// follower/likes count, a "who's following" friend list) — none of that is
// real Pueblo Connect content, so it's dropped here, same judgment call as
// terms/page.tsx dropping irrelevant vendor sections. What's kept is the
// one paragraph of real mission copy and the real contact-style basics,
// restructured into the simpler banner+sidebar layout already used by
// terms/page.tsx for a static content page.
export default function AboutPage() {
  return (
    <>
      <Header />

      <section>
        <div className="gap2 color-bg">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="top-banner">
                  <h1>About Pueblo Connect</h1>
                </div>
                <nav className="breadcrumb">
                  <Link className="breadcrumb-item" href="/">Home</Link>
                  <span className="breadcrumb-item active">About</span>
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
                  <div className="about">
                    <div className="personal">
                      <h5 className="f-title"><i className="ti-info-alt" /> Our Mission</h5>
                      <p>
                        Pueblo Connect and The Daily Pueblo work together to
                        keep our neighborhoods informed, connected, and
                        engaged. The Daily Pueblo brings local stories and
                        community voices to readers in print, while Pueblo
                        Connect gives residents and local businesses a place
                        to connect, share, discover events, support
                        neighborhood businesses, and continue the
                        conversation online. Together, we connect the
                        Pueblo&mdash;in print, online, and in the community.
                      </p>
                    </div>
                    <div className="personal">
                      <h5 className="f-title"><i className="ti-location-pin" /> Basic info</h5>
                      <ul className="basics">
                        <li><i className="ti-user" /> Pueblo Connect</li>
                        <li><i className="ti-map-alt" /> Highland Park, Los Angeles</li>
                        <li><i className="ti-email" /> latenitegano@gmail.com</li>
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
