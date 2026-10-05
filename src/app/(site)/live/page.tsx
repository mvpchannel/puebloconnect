import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import StreamsBrowser from "@/components/StreamsBrowser";
import PuebloLiveHero from "@/components/PuebloLiveHero";
import LiveFeatured from "@/components/LiveFeatured";
import SeeSomethingPromo from "@/components/SeeSomethingPromo";
import LiveGoLiveButton from "@/components/LiveGoLiveButton";
import { getCurrentUser } from "@/lib/require-user";
import { listStreams, getLiveViewerCount, StreamWithHost } from "@/lib/db";
import { PLACEHOLDER } from "@/lib/placeholders";
import { toEmbedSrc } from "@/lib/stream-embed";

export const metadata: Metadata = {
  title: "Pueblo Live",
};

// Always fresh — who's live changes minute to minute.
export const dynamic = "force-dynamic";

const NAVY = "#0b2a5b";
const AVATAR = "/images/defaults/default-avatar-male.jpg";

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 1px 6px rgba(11,42,91,0.08)",
};

function hostName(s: StreamWithHost) {
  return [s.host_first_name, s.host_last_name].filter(Boolean).join(" ") || s.host_username;
}

function when(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  return d.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
}

// Real backend: src/app/api/streams/* and the streams tables in
// src/lib/db.ts. Bring-your-own-stream — see StreamCreateForm.
export default async function LivePage() {
  const session = await getCurrentUser();
  const viewerId = session?.sub ?? null;
  const live = listStreams("live", viewerId)
    .map((s) => ({ s, watching: getLiveViewerCount(s.id) }))
    .sort((a, b) => b.watching - a.watching);
  const upcoming = listStreams("scheduled", viewerId, 6);
  const featured = live[0];
  const others = live.slice(1, 5);

  return (
    <>
      <Header />
      <section>
        <div className="gap2 top-margin">
          <div className="container">
            <div className="row merged20" id="page-contents">
              <div className="col-lg-3">
                <Sidebar />
                <SeeSomethingPromo />
              </div>
              <div className="col-lg-9">
                <PuebloLiveHero isLoggedIn={Boolean(session)} />

                {featured ? (
                  <LiveFeatured
                    isLoggedIn={Boolean(session)}
                    stream={{
                      id: featured.s.id,
                      title: featured.s.title,
                      description: featured.s.description,
                      hostName: hostName(featured.s),
                      hostId: featured.s.host_id,
                      hostProfilePhotoPath: featured.s.host_profile_photo_path,
                      embedSrc: toEmbedSrc(featured.s.platform, featured.s.embed_url),
                      likeCount: featured.s.like_count,
                      liked: Boolean(featured.s.liked_by_viewer),
                      commentCount: featured.s.comment_count,
                      watching: featured.watching,
                    }}
                  />
                ) : (
                  <div className="pc-live-grid">
                    <div style={{ ...card, textAlign: "center", padding: "56px 24px" }}>
                      <div style={{ fontSize: 44, color: "#c9d3e3" }}>
                        <i className="fa fa-video-camera" />
                      </div>
                      <h3 style={{ color: NAVY, fontWeight: 800, margin: "12px 0 6px" }}>
                        Nobody&apos;s live right now
                      </h3>
                      <p style={{ color: "#6b7a90", maxWidth: 420, margin: "0 auto 20px" }}>
                        Be the first. Broadcast on YouTube, Facebook or Vimeo, add it here, and your neighbors
                        can watch and chat with you.
                      </p>
                      <LiveGoLiveButton isLoggedIn={Boolean(session)} />
                    </div>
                    <aside style={{ ...card, display: "flex", alignItems: "center", justifyContent: "center", color: "#8a97aa", textAlign: "center" }}>
                      Live chat appears here when a stream is on.
                    </aside>
                  </div>
                )}

                <div className="pc-live-lower">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "22px 0 12px" }}>
                      <h3 style={{ margin: 0, color: NAVY, fontWeight: 800 }}>More Live Streams</h3>
                    </div>
                    {others.length === 0 ? (
                      <div style={{ ...card, color: "#8a97aa", textAlign: "center" }}>
                        {featured ? "No other streams are live right now." : "Live streams will show up here."}
                      </div>
                    ) : (
                      <div className="pc-live-cards">
                        {others.map(({ s, watching }) => (
                          <Link key={s.id} href={`/live/${s.id}`} title="" style={{ textDecoration: "none", color: "inherit" }}>
                            <div style={{ position: "relative", height: 120, borderRadius: 14, backgroundImage: `linear-gradient(rgba(11,42,91,0.25), rgba(11,42,91,0.25)), url(${PLACEHOLDER.stream})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                              <span style={{ position: "absolute", top: 8, left: 8, background: "#e8261e", color: "#fff", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 5 }}>
                                ● LIVE
                              </span>
                              <span style={{ position: "absolute", top: 8, left: 70, background: "rgba(10,20,40,0.7)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5 }}>
                                <i className="fa fa-eye" /> {watching}
                              </span>
                              <i className="fa fa-play-circle" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "rgba(255,255,255,0.8)", fontSize: 38 }} />
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                              <img src={s.host_profile_photo_path || AVATAR} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, lineHeight: 1.25 }}>{s.title}</div>
                                <div style={{ fontSize: 12, color: "#6b7a90" }}>{hostName(s)}</div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <aside style={{ ...card, marginTop: 22, alignSelf: "start" }}>
                    <h4 style={{ margin: "0 0 12px", color: NAVY, fontWeight: 800 }}>Upcoming Live Streams</h4>
                    {upcoming.length === 0 ? (
                      <p style={{ color: "#8a97aa", fontSize: 14, margin: 0 }}>Nothing scheduled yet.</p>
                    ) : (
                      upcoming.map((s) => (
                        <Link key={s.id} href={`/live/${s.id}`} title="" style={{ display: "flex", gap: 12, padding: "10px 0", textDecoration: "none", borderTop: "1px solid #eef2f8" }}>
                          <div style={{ width: 58, height: 44, borderRadius: 8, backgroundImage: `url(${PLACEHOLDER.stream})`, backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: NAVY, lineHeight: 1.25 }}>{s.title}</div>
                            <div style={{ fontSize: 12, color: "#6b7a90" }}>{when(s.scheduled_for) || hostName(s)}</div>
                          </div>
                        </Link>
                      ))
                    )}
                  </aside>
                </div>

                <h3 style={{ margin: "26px 0 10px", color: NAVY, fontWeight: 800 }}>Browse Streams</h3>
                <StreamsBrowser isLoggedIn={Boolean(session)} tabs={["scheduled", "ended"]} />
              </div>
            </div>
          </div>
        </div>
      </section>
      <style>{`
        .pc-live-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start; }
        .pc-live-lower { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; }
        .pc-live-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 16px; }
        @media (max-width: 991px) {
          .pc-live-grid, .pc-live-lower { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>
      <Footer />
    </>
  );
}
