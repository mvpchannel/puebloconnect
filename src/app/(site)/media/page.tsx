import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/require-user";
import { listStreams, listSpotlights } from "@/lib/db";
import { formatPuebloTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Pueblo Media Hub",
  description: "Watch Pueblo Live broadcasts and replays, and read Business Spotlight stories.",
};

export const dynamic = "force-dynamic";

// Watch + Read in one place, from what actually exists: Pueblo Live
// (live, upcoming, and ended broadcasts, which are the replays) and published
// Business Spotlight stories. The Daily Pueblo's own articles are not
// published on this site yet, and the page says so rather than faking a feed.
export default async function MediaHubPage() {
  const session = await getCurrentUser();
  const viewerId = session?.sub ?? null;

  const live = listStreams("live", viewerId, 6);
  const upcoming = listStreams("scheduled", viewerId, 6);
  const replays = listStreams("ended", viewerId, 8);
  const stories = listSpotlights({ publishedOnly: true }).slice(0, 4);

  const card: React.CSSProperties = { padding: "14px 20px" };
  const head = (text: string, href?: string, more?: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "20px 0 8px" }}>
      <h5 style={{ margin: 0 }}>{text}</h5>
      {href && more && <Link href={href} title="" style={{ fontSize: 13 }}>{more}</Link>}
    </div>
  );
  const hostName = (s: (typeof live)[number]) =>
    [s.host_first_name, s.host_last_name].filter(Boolean).join(" ") || s.host_username;
  const row = (s: (typeof live)[number], note: string) => (
    <div className="central-meta item" key={s.id}>
      <div style={card}>
        <Link href={`/live/${s.id}`} title=""><strong>{s.title}</strong></Link>
        <div style={{ fontSize: 13, color: "#888" }}>{hostName(s)} · {note}</div>
      </div>
    </div>
  );

  return (
    <>
      <Header />
      <section>
        <div className="gap2 top-margin">
          <div className="container">
            <div className="row merged20" id="page-contents">
              <div className="col-lg-3">
                <Sidebar />
              </div>
              <div className="col-lg-9">
                <h3 style={{ marginBottom: 4 }}>Pueblo Media Hub</h3>
                <p style={{ color: "#888", marginBottom: 6 }}>Watch. Read. Discover. Connect.</p>

                {head("Watch")}
                {live.length > 0 && (
                  <>
                    <div style={{ color: "#e02020", fontWeight: 600, marginTop: 4 }}>● Live now</div>
                    {live.map((s) => row(s, s.started_at ? `started ${formatPuebloTime(new Date(s.started_at))}` : "live"))}
                  </>
                )}
                {upcoming.length > 0 && (
                  <>
                    <div style={{ fontWeight: 600, marginTop: 10 }}>Coming up</div>
                    {upcoming.map((s) => row(s, s.scheduled_for ? formatPuebloTime(new Date(s.scheduled_for)) : "scheduled"))}
                  </>
                )}
                {replays.length > 0 && (
                  <>
                    <div style={{ fontWeight: 600, marginTop: 10 }}>Replays</div>
                    {replays.map((s) => row(s, s.ended_at ? formatPuebloTime(new Date(s.ended_at)) : "replay"))}
                  </>
                )}
                {!live.length && !upcoming.length && !replays.length && (
                  <div className="central-meta item">
                    <div style={{ ...card, color: "#888" }}>No broadcasts yet. See <Link href="/live" title="">Pueblo Live</Link>.</div>
                  </div>
                )}

                {head("Read", stories.length ? "/spotlight" : undefined, "All stories")}
                {stories.map((sp) => (
                  <div className="central-meta item" key={sp.id}>
                    <div style={card}>
                      <Link href={`/spotlight/${sp.slug}`} title=""><strong>{sp.title}</strong></Link>
                      <div style={{ fontSize: 14, color: "#555" }}>{sp.summary}</div>
                    </div>
                  </div>
                ))}
                {!stories.length && (
                  <div className="central-meta item">
                    <div style={{ ...card, color: "#888" }}>No stories published yet.</div>
                  </div>
                )}
                <p style={{ color: "#888", fontSize: 14, marginTop: 14 }}>
                  The Daily Pueblo&rsquo;s own articles and other Pueblo-produced media aren&rsquo;t published here yet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
