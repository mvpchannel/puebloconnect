import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { INTRO, FLOW, FLOW_NOTE, GROUPS, type Status } from "./about-content";

export const metadata: Metadata = {
  title: "About Pueblo Connect",
  description:
    "Pueblo Connect is the digital town square for our community — residents, local businesses, events, deals and news in one place.",
};

const STATUS_LABEL: Record<Status, { text: string; color: string }> = {
  live: { text: "Live", color: "#1f9d55" },
  prototype: { text: "Prototype", color: "#d98c00" },
  soon: { text: "Coming soon", color: "#7b8794" },
};

// Public "what is Pueblo Connect" page (mission + every program, tagged
// Live / Prototype / Coming soon from ./about-content.ts). Originally ported from winku-html/about.html. The original vendor page is really a
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
              <div className="col-lg-10 offset-lg-1">
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
                      <h5 className="f-title"><i className="ti-home" /> What is Pueblo Connect?</h5>
                      {INTRO.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                      <p style={{ marginBottom: 0 }}>
                        <Link className="mtr-btn signup" href="/login?register=1" title="">
                          <span>Join Pueblo Connect — it&rsquo;s free</span>
                        </Link>
                      </p>
                    </div>
                    <div className="personal">
                      <h5 className="f-title"><i className="ti-layout-grid2" /> How it all connects</h5>
                      <p style={{ fontWeight: 600 }}>{FLOW}</p>
                      <p>{FLOW_NOTE}</p>
                    </div>
                  </div>
                </div>

                {GROUPS.map((group) => (
                  <div className="central-meta" key={group.title} style={{ marginTop: 20 }}>
                    <div className="about">
                      <div className="personal">
                        <h5 className="f-title"><i className={group.icon} /> {group.title}</h5>
                        <div className="row">
                          {group.programs.map((prog) => {
                            const st = STATUS_LABEL[prog.status];
                            const inner = (
                              <>
                                <h6 style={{ marginBottom: 6 }}>
                                  {prog.name}{" "}
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: st.color, borderRadius: 10, padding: "2px 8px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                    {st.text}
                                  </span>
                                </h6>
                                <p style={{ margin: 0, color: "#555", fontSize: 14 }}>{prog.description}</p>
                              </>
                            );
                            return (
                              <div className="col-md-6" key={prog.name} style={{ marginBottom: 18 }}>
                                {prog.href ? (
                                  <Link href={prog.href} title="" style={{ display: "block", color: "inherit" }}>
                                    {inner}
                                  </Link>
                                ) : (
                                  <div>{inner}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="central-meta" style={{ marginTop: 20 }}>
                  <div className="about">
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
