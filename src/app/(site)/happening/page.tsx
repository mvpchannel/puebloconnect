import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/require-user";
import { listStreams, listEvents, listActiveDeals, listSpotlights, listClassifieds } from "@/lib/db";
import { formatPuebloTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "What's Happening in the Pueblo",
  description: "Live broadcasts, upcoming events, deals, business stories and community listings, all in one place.",
};

export const dynamic = "force-dynamic";

// A "see what's interesting right now" overview. Every section is the newest
// real content from its own table; nothing here is ranked as "trending",
// because no popularity signal is computed. Empty sections are hidden.
// Member posts and photos are not included: the feed is for members.
export default async function HappeningPage() {
  const session = await getCurrentUser();
  const viewerId = session?.sub ?? null;

  const liveNow = listStreams("live", viewerId).slice(0, 4);
  const events = listEvents("upcoming", 5);
  const deals = listActiveDeals(4);
  const spotlight = listSpotlights({ publishedOnly: true })[0] ?? null;
  const classifieds = listClassifieds({ limit: 4 });

  const empty = !liveNow.length && !events.length && !deals.length && !spotlight && !classifieds.length;
  const card: React.CSSProperties = { padding: "14px 20px" };
  const head = (text: string, href: string, more: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "18px 0 8px" }}>
      <h5 style={{ margin: 0 }}>{text}</h5>
      <Link href={href} title="" style={{ fontSize: 13 }}>{more}</Link>
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
                <h3 style={{ marginBottom: 4 }}>What&rsquo;s Happening in the Pueblo</h3>
                <p style={{ color: "#888", marginBottom: 6 }}>
                  The newest from around the community. For just today, see <Link href="/tonight" title="">What&rsquo;s Happening Tonight</Link>.
                </p>

                {empty && (
                  <div className="central-meta item">
                    <div style={{ ...card, textAlign: "center", color: "#888", padding: 24 }}>Nothing to show yet. Check back soon.</div>
                  </div>
                )}

                {liveNow.length > 0 && (
                  <>
                    {head("● Live right now", "/live", "Pueblo Live")}
                    {liveNow.map((s) => (
                      <div className="central-meta item" key={s.id}>
                        <div style={card}><Link href={`/live/${s.id}`} title=""><strong>{s.title}</strong></Link></div>
                      </div>
                    ))}
                  </>
                )}

                {events.length > 0 && (
                  <>
                    {head("Coming up", "/events", "All events")}
                    {events.map((e) => (
                      <div className="central-meta item" key={e.id}>
                        <div style={card}>
                          <Link href={`/events/${e.slug}`} title=""><strong>{e.title}</strong></Link>
                          <div style={{ fontSize: 13, color: "#888" }}>
                            {formatPuebloTime(new Date(e.starts_at))}{e.location_text && <> · {e.location_text}</>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {deals.length > 0 && (
                  <>
                    {head("Deals", "/deals", "All deals")}
                    {deals.map((d) => (
                      <div className="central-meta item" key={d.id}>
                        <div style={card}>
                          <strong>{d.title}</strong> — {d.discount_text}
                          <div style={{ fontSize: 13, color: "#888" }}>
                            <Link href={`/businesses/${d.business_slug}`} title="">{d.business_name}</Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {spotlight && (
                  <>
                    {head("Business Spotlight", "/spotlight", "More stories")}
                    <div className="central-meta item">
                      <div style={card}>
                        <Link href={`/spotlight/${spotlight.slug}`} title=""><strong>{spotlight.title}</strong></Link>
                        <div style={{ fontSize: 14, color: "#555" }}>{spotlight.summary}</div>
                      </div>
                    </div>
                  </>
                )}

                {classifieds.length > 0 && (
                  <>
                    {head("New in Classifieds", "/classifieds", "All listings")}
                    {classifieds.map((c) => (
                      <div className="central-meta item" key={c.id}>
                        <div style={card}>
                          <Link href={`/classifieds/${c.id}`} title=""><strong>{c.title}</strong></Link>
                          {c.price_text && <span style={{ color: "#888" }}> · {c.price_text}</span>}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
