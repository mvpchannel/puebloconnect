import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/require-user";
import { listStreams, listEventsStartingAfter, listActiveDeals } from "@/lib/db";
import { endOfPuebloDay, formatPuebloTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "What's Happening Tonight",
  description: "Live broadcasts, events and deals happening in the Pueblo today and tonight.",
};

// Always computed per request: "tonight" changes by the minute.
export const dynamic = "force-dynamic";

const NO_END_EVENT_GRACE_MS = 3 * 60 * 60 * 1000; // an event with no end time counts as "on" for 3 hours

// Everything happening in the Pueblo between now and the end of today
// (Pueblo local time): live broadcasts, scheduled broadcasts, events, and
// deals that are flash/expiring today. All real data — nothing is shown
// that isn't in the events/streams/deals tables.
export default async function TonightPage() {
  const session = await getCurrentUser();
  const viewerId = session?.sub ?? null;
  const now = new Date();
  const endOfDay = endOfPuebloDay(now);

  const liveNow = listStreams("live", viewerId);
  const scheduledToday = listStreams("scheduled", viewerId).filter(
    (s) => s.scheduled_for && new Date(s.scheduled_for) < endOfDay
  );

  const events = listEventsStartingAfter(new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString())
    .filter((e) => {
      const start = new Date(e.starts_at);
      if (start >= endOfDay) return false;
      const end = e.ends_at ? new Date(e.ends_at) : new Date(start.getTime() + NO_END_EVENT_GRACE_MS);
      return end >= now;
    });
  const eventsNow = events.filter((e) => new Date(e.starts_at) <= now);
  const eventsLater = events.filter((e) => new Date(e.starts_at) > now);

  const deals = listActiveDeals(100).filter(
    (d) => d.type === "flash" || (d.expires_at && new Date(d.expires_at) < endOfDay)
  );

  const nothing =
    liveNow.length + scheduledToday.length + events.length + deals.length === 0;

  const card: React.CSSProperties = { padding: "16px 20px" };
  const hostName = (s: (typeof liveNow)[number]) =>
    [s.host_first_name, s.host_last_name].filter(Boolean).join(" ") || s.host_username;

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
                <h3 style={{ marginBottom: 4 }}>What&rsquo;s Happening Tonight</h3>
                <p style={{ color: "#888", marginBottom: 16 }}>
                  Live broadcasts, events and deals in the Pueblo between now and midnight.
                </p>

                {nothing && (
                  <div className="central-meta item">
                    <div style={{ ...card, textAlign: "center", color: "#888", padding: 24 }}>
                      Nothing is scheduled for tonight yet. Check the{" "}
                      <Link href="/events" title="">events calendar</Link>, browse{" "}
                      <Link href="/deals" title="">Pueblo Deals</Link>, or{" "}
                      <Link href="/live" title="">see Pueblo Live</Link>.
                    </div>
                  </div>
                )}

                {liveNow.length > 0 && (
                  <>
                    <h5 style={{ margin: "16px 0 8px" }}><span style={{ color: "#e02020" }}>●</span> Live right now</h5>
                    {liveNow.map((s) => (
                      <div className="central-meta item" key={s.id}>
                        <div style={card}>
                          <h4 style={{ marginBottom: 4 }}>
                            <Link href={`/live/${s.id}`} title="">{s.title}</Link>
                          </h4>
                          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
                            {hostName(s)}
                            {s.started_at && <> · started {formatPuebloTime(new Date(s.started_at.replace(" ", "T") + "Z"))}</>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {(eventsNow.length > 0 || eventsLater.length > 0) && (
                  <>
                    <h5 style={{ margin: "16px 0 8px" }}>Events</h5>
                    {[...eventsNow.map((e) => ({ e, label: "Happening now" })), ...eventsLater.map((e) => ({ e, label: formatPuebloTime(new Date(e.starts_at)) }))].map(({ e, label }) => (
                      <div className="central-meta item" key={e.id}>
                        <div style={card}>
                          <h4 style={{ marginBottom: 4 }}>
                            <Link href={`/events/${e.slug}`} title="">{e.title}</Link>
                          </h4>
                          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
                            <strong style={{ color: label === "Happening now" ? "#1f9d55" : "#555" }}>{label}</strong>
                            {e.location_text && <> · {e.location_text}</>}
                            {e.business_name && e.business_slug && (
                              <> · <Link href={`/businesses/${e.business_slug}`} title="">{e.business_name}</Link></>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {scheduledToday.length > 0 && (
                  <>
                    <h5 style={{ margin: "16px 0 8px" }}>Going live later today</h5>
                    {scheduledToday.map((s) => (
                      <div className="central-meta item" key={s.id}>
                        <div style={card}>
                          <h4 style={{ marginBottom: 4 }}>
                            <Link href={`/live/${s.id}`} title="">{s.title}</Link>
                          </h4>
                          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
                            {hostName(s)}
                            {s.scheduled_for && <> · {formatPuebloTime(new Date(s.scheduled_for))}</>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {deals.length > 0 && (
                  <>
                    <h5 style={{ margin: "16px 0 8px" }}>Deals</h5>
                    {deals.map((d) => (
                      <div className="central-meta item" key={d.id}>
                        <div style={card}>
                          <h4 style={{ marginBottom: 4 }}>
                            {d.type === "flash" && <span style={{ color: "#e02020" }}>🔥 FLASH DEAL — </span>}
                            {d.title}
                          </h4>
                          <p style={{ margin: "2px 0", fontWeight: "bold" }}>{d.discount_text}</p>
                          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
                            <Link href={`/businesses/${d.business_slug}`} title="">{d.business_name}</Link>
                            {d.expires_at && <> · ends {formatPuebloTime(new Date(d.expires_at))}</>}
                            {" · "}
                            <Link href="/deals" title="">Claim on Pueblo Deals</Link>
                          </p>
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
