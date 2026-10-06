import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/require-user";
import { getUserById, getTotalPointsForUser, getCurrentRewardsLevel, getMembershipForUser } from "@/lib/db";
import { viewerAvatarSrc } from "@/lib/viewer";

export const metadata: Metadata = { title: "Pueblo Pass" };
export const dynamic = "force-dynamic";

// Member-only (middleware.ts). The Pass is the member's digital card. Today
// it shows the Pueblo Pass artwork with real account facts (name, member
// since, points level, business plan). Redeeming it at participating businesses is NOT built, and the page
// says so rather than implying discounts exist.
export default async function PassPage() {
  const session = await getCurrentUser();
  const user = session ? getUserById(session.sub) : undefined;
  if (!session || !user) {
    return (
      <>
        <Header />
        <div className="container" style={{ padding: 40 }}>
          <Link href="/login">Log in</Link> to see your Pueblo Pass.
        </div>
        <Footer />
      </>
    );
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
  const points = getTotalPointsForUser(user.id);
  const level = getCurrentRewardsLevel(user.id);
  const membership = getMembershipForUser(user.id);
  const since = new Date(user.created_at.replace(" ", "T") + "Z").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });
  const passNumber = `PP-${String(user.id).padStart(6, "0")}`;

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
                <h3 style={{ marginBottom: 14 }}>Pueblo Pass</h3>

                {/* Official Pueblo Pass artwork on top; the member's real details below. */}
                <div
                  style={{
                    maxWidth: 560,
                    borderRadius: 22,
                    overflow: "hidden",
                    background: "#fff",
                    boxShadow: "0 8px 24px rgba(10,40,100,.28)",
                    border: "2px solid #0b3d91",
                    marginBottom: 18,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/pueblo-pass-art.png"
                    alt="Pueblo Pass. Local people, real deals, stronger communities."
                    style={{ display: "block", width: "100%", height: "auto" }}
                  />
                  <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 18px", flexWrap: "wrap" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewerAvatarSrc(user.id)}
                      alt=""
                      width={72}
                      height={72}
                      style={{ borderRadius: "50%", objectFit: "cover", border: "3px solid #0b3d91", flex: "none" }}
                    />
                    <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#0b2a6b", lineHeight: 1.15, overflowWrap: "anywhere" }}>{name}</div>
                      <div style={{ fontSize: 14, color: "#222", margin: "2px 0 6px" }}>Member since {since}</div>
                      <span
                        style={{
                          display: "inline-block",
                          background: "#f5c518",
                          color: "#111",
                          fontWeight: 800,
                          letterSpacing: 1,
                          borderRadius: 8,
                          padding: "3px 16px",
                          fontSize: 16,
                        }}
                      >
                        {passNumber}
                      </span>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0b2a6b", marginTop: 6 }}>
                        {level.label} <span style={{ color: "#f5a000" }}>·</span> {points.toLocaleString("en-US")} pts
                      </div>
                      {membership?.status === "active" && (
                        <div style={{ marginTop: 2, fontSize: 12, color: "#555", textTransform: "capitalize" }}>
                          Business plan: {membership.plan}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="central-meta item" style={{ padding: 20 }}>
                  <p style={{ color: "#555", fontSize: 14 }}>
                    Your <strong>Pass</strong> is your membership card. Your <Link href="/passport">Passport</Link> is where
                    you collect stamps for places you visit.
                  </p>
                  <h5>What you can use today</h5>
                  <ul style={{ paddingLeft: 20 }}>
                    <li><Link href="/deals">Pueblo Deals</Link> — local offers you can claim</li>
                    <li><Link href="/rewards">Pueblo Points</Link> — earn points for community activity</li>
                    <li><Link href="/passport">Pueblo Passport</Link> — collect stamps for places you visit</li>
                    <li><Link href="/events">Events</Link> — see what&rsquo;s happening</li>
                  </ul>
                  <p style={{ color: "#888", fontSize: 14, marginBottom: 0 }}>
                    Showing your Pass at participating businesses for discounts and rewards is planned but not available
                    yet. Your card above is your real account information, not a redeemable coupon.
                  </p>
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
