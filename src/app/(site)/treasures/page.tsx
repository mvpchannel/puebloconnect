import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/require-user";
import { listDropClaimsForUser } from "@/lib/db";

export const metadata: Metadata = { title: "My Treasures" };
export const dynamic = "force-dynamic";

// Member-only (middleware.ts). The treasures this member has found in the 3D
// Pueblo, with the code to show when redeeming each prize.
export default async function TreasuresPage() {
  const session = await getCurrentUser();
  const claims = session ? listDropClaimsForUser(session.sub) : [];
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
                <h3 style={{ marginBottom: 4 }}>My Treasures</h3>
                <p style={{ color: "#888", marginBottom: 14 }}>
                  Treasures you&rsquo;ve found hidden in the <Link href="/explore-3d" title="">3D Pueblo</Link>. Show the code to
                  claim the prize.
                </p>
                {claims.length === 0 && (
                  <div className="central-meta item">
                    <div style={{ padding: 24, textAlign: "center", color: "#888" }}>
                      Nothing yet. Look for glowing gems while you explore the 3D Pueblo.
                    </div>
                  </div>
                )}
                {claims.map((c) => (
                  <div className="central-meta item" key={c.id}>
                    <div style={{ padding: "14px 20px" }}>
                      <h4 style={{ marginBottom: 4 }}>
                        {c.kind === "golden_ticket" && "🎫 "}{c.title}
                      </h4>
                      <p style={{ marginBottom: 6 }}>{c.prize_text}</p>
                      <div style={{ fontSize: 14 }}>
                        Code: <strong style={{ letterSpacing: 2 }}>{c.code}</strong>
                        {c.redeemed_at ? <span style={{ color: "#1f9d55" }}> · Redeemed</span> : <span style={{ color: "#888" }}> · Not yet redeemed</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#888" }}>
                        Found {new Date(c.claimed_at.replace(" ", "T") + "Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" })}
                        {c.points > 0 && ` · +${c.points} points`}
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
