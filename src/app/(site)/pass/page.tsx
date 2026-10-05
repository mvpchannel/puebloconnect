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
// it shows real account facts (name, member since, points level, business
// plan). Redeeming it at participating businesses is NOT built, and the page
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

                <div
                  style={{
                    maxWidth: 420,
                    borderRadius: 14,
                    padding: 22,
                    color: "#fff",
                    background: "linear-gradient(135deg,#088dcd,#0b5e8c)",
                    boxShadow: "0 6px 18px rgba(0,0,0,.18)",
                    marginBottom: 18,
                  }}
                >
                  <div style={{ fontSize: 12, letterSpacing: 1.5, opacity: 0.85 }}>PUEBLO CONNECT</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Pueblo Pass</div>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={viewerAvatarSrc(user.id)} alt="" width={64} height={64} style={{ borderRadius: "50%", objectFit: "cover", border: "2px solid #fff" }} />
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600 }}>{name}</div>
                      <div style={{ fontSize: 13, opacity: 0.9 }}>Member since {since}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, fontSize: 13 }}>
                    <span>{passNumber}</span>
                    <span>{level.label} · {points.toLocaleString("en-US")} pts</span>
                  </div>
                  {membership?.status === "active" && (
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9, textTransform: "capitalize" }}>
                      Business plan: {membership.plan}
                    </div>
                  )}
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
