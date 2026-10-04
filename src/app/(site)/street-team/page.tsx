import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import StreetTeamSubmitForm from "@/components/StreetTeamSubmitForm";
import { getCurrentUser } from "@/lib/require-user";
import {
  listApprovedStreetTeamSubmissions,
  listStreetTeamSubmissionsByUser,
  getStreetTeamBadgesForUser,
  streetTeamBadgeLabel,
} from "@/lib/db";

export const metadata: Metadata = {
  title: "Pueblo Street Team",
};

// Public approved-only gallery + a submission form for logged-in members.
// Real backend: src/app/api/street-team/* and the street_team_submissions
// table in src/lib/db.ts. Approval happens only through the admin review
// queue (/admin/street-team) — nothing here publishes straight to the
// gallery.
export default async function StreetTeamPage() {
  const session = await getCurrentUser();
  const approved = listApprovedStreetTeamSubmissions();

  const mySubmissions = session ? listStreetTeamSubmissionsByUser(session.sub) : [];
  const myBadges = session ? getStreetTeamBadgesForUser(session.sub) : [];

  const shapedMine = mySubmissions.map((s) => ({
    id: s.id,
    mediaType: s.media_type,
    mediaUrl: s.media_url,
    caption: s.caption,
    locationText: s.location_text,
    status: s.status,
    reviewNote: s.review_note,
    createdAt: s.created_at,
  }));
  const shapedBadges = myBadges.map((b) => ({ key: b, label: streetTeamBadgeLabel(b) }));

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
                <h3 style={{ marginBottom: 4 }}>Pueblo Street Team</h3>
                <p style={{ color: "#888", marginBottom: 20 }}>
                  Out and about in the Pueblo? Share what you see — approved
                  photos and videos show up in the gallery below.
                </p>

                <StreetTeamSubmitForm
                  isLoggedIn={Boolean(session)}
                  initialSubmissions={shapedMine}
                  initialBadges={shapedBadges}
                />

                <h4 style={{ margin: "28px 0 16px" }}>Gallery</h4>
                {approved.length === 0 && (
                  <div className="central-meta item">
                    <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                      No approved submissions yet — be the first to share something!
                    </div>
                  </div>
                )}
                <div className="row">
                  {approved.map((s) => {
                    const badges = getStreetTeamBadgesForUser(s.submitter_id);
                    const submitterName =
                      [s.submitter_first_name, s.submitter_last_name].filter(Boolean).join(" ") ||
                      s.submitter_username;
                    return (
                      <div className="col-md-6" key={s.id} style={{ marginBottom: 20 }}>
                        <div className="central-meta item" style={{ height: "100%" }}>
                          <div style={{ padding: "16px 20px" }}>
                            <div style={{ fontSize: 13, marginBottom: 6 }}>
                              {s.media_type === "photo" ? (
                                <img
                                  src={s.media_url}
                                  alt={s.caption ?? ""}
                                  style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 4 }}
                                />
                              ) : (
                                <a href={s.media_url} target="_blank" rel="noreferrer">
                                  🎥 Watch video
                                </a>
                              )}
                            </div>
                            {s.caption && <p style={{ margin: "6px 0" }}>{s.caption}</p>}
                            {s.location_text && (
                              <p style={{ fontSize: 12, color: "#999", margin: "2px 0" }}>📍 {s.location_text}</p>
                            )}
                            <p style={{ fontSize: 12, color: "#999", margin: "6px 0 0" }}>
                              by {submitterName}
                              {badges.length > 0 && (
                                <span style={{ marginLeft: 6 }}>
                                  {badges.map((b) => (
                                    <span key={b} title={streetTeamBadgeLabel(b)} style={{ marginRight: 4 }}>
                                      🎖
                                    </span>
                                  ))}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
