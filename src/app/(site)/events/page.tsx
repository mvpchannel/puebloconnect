import type { Metadata } from "next";
import { PLACEHOLDER } from "@/lib/placeholders";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import EventCreateForm from "@/components/EventCreateForm";
import { getCurrentUser } from "@/lib/require-user";
import { listEvents, listBusinessesForOwner } from "@/lib/db";

export const metadata: Metadata = {
  title: "Events",
};

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Browse + create events — RSVP, check-in, a wall, all backed by real
// data (events/event_rsvps/event_checkins tables). Real backend:
// src/app/api/events/route.ts.
export default async function EventsPage() {
  const session = await getCurrentUser();
  const upcoming = listEvents("upcoming");
  const ownedBusinesses = session
    ? listBusinessesForOwner(session.sub).map((b) => ({ id: b.id, name: b.name }))
    : [];

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
                <h3 style={{ marginBottom: 16 }}>Events</h3>
                {session ? (
                  <EventCreateForm ownedBusinesses={ownedBusinesses} />
                ) : (
                  <div className="central-meta item" style={{ padding: "20px", textAlign: "center" }}>
                    <Link href="/login" title="">Log in</Link> to create an event.
                  </div>
                )}

                {upcoming.length === 0 && (
                  <div className="central-meta item">
                    <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                      No upcoming events yet — be the first to create one.
                    </div>
                  </div>
                )}

                {upcoming.map((event) => (
                  <div className="central-meta item" key={event.id}>
                    <div style={{ padding: "16px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                      <img src={event.cover_photo_path || PLACEHOLDER.eventCover} alt="" style={{ width: 150, height: 84, objectFit: "cover", borderRadius: 12, flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                      <h4 style={{ marginBottom: 4 }}>
                        <Link href={`/events/${event.slug}`} title="">{event.title}</Link>
                      </h4>
                      <span style={{ color: "#999", fontSize: 13 }}>
                        {formatEventDate(event.starts_at)}
                        {event.location_text && ` · ${event.location_text}`}
                        {event.business_name && (
                          <>
                            {" "}
                            · hosted by{" "}
                            <Link href={`/businesses/${event.business_slug}`} title="">{event.business_name}</Link>
                          </>
                        )}
                      </span>
                      {event.description && (
                        <p style={{ color: "#666", margin: "4px 0 8px" }}>{event.description}</p>
                      )}
                      <span style={{ color: "#999", fontSize: 13 }}>
                        {event.going_count} going · {event.interested_count} interested
                      </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
