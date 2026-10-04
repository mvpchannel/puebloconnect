import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import PassportPanel from "@/components/PassportPanel";
import { getCurrentUser } from "@/lib/require-user";
import { listPassportStampsForUser, getPassportRewardsForUser } from "@/lib/db";

export const metadata: Metadata = {
  title: "Pueblo Passport",
};

// Member-only (enforced in middleware.ts, same as /profile and
// /explore-3d) — a passport is tied to one real account. Real backend:
// src/app/api/passport/*, the passport_stamps table in src/lib/db.ts,
// and PassportVisitBeacon on the pages that grant stamps.
export default async function PassportPage() {
  const session = await getCurrentUser();
  const stamps = session ? listPassportStampsForUser(session.sub) : [];
  const rewards = session ? getPassportRewardsForUser(session.sub) : [];

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
                <h3 style={{ marginBottom: 4 }}>Pueblo Passport</h3>
                <p style={{ color: "#888", marginBottom: 20 }}>
                  Collect stamps by exploring the Pueblo — visit business channels, check into
                  events, watch Pueblo Live, and explore in 3D.
                </p>
                <PassportPanel
                  stamps={stamps.map((s) => ({
                    id: s.id,
                    category: s.category,
                    refId: s.ref_id,
                    label: s.label,
                    createdAt: s.created_at,
                  }))}
                  rewards={rewards}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
