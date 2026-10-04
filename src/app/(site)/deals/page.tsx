import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import DealClaimButton from "@/components/DealClaimButton";
import { getCurrentUser } from "@/lib/require-user";
import { listActiveDeals, hasClaimedDeal } from "@/lib/db";

export const metadata: Metadata = {
  title: "Pueblo Deals",
};

// Every active deal site-wide — flash deals first (soonest-expiring
// first), then standard deals. Real backend: src/app/api/deals/route.ts,
// src/lib/db.ts (deals/deal_claims tables).
export default async function DealsPage() {
  const session = await getCurrentUser();
  const deals = listActiveDeals();

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
                <h3 style={{ marginBottom: 16 }}>Pueblo Deals</h3>

                {deals.length === 0 && (
                  <div className="central-meta item">
                    <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                      No active deals right now — check back soon, or{" "}
                      <Link href="/businesses" title="">visit a business channel</Link> to see if they're
                      running one.
                    </div>
                  </div>
                )}

                {deals.map((deal) => (
                  <div className="central-meta item" key={deal.id}>
                    <div style={{ padding: "16px 20px" }}>
                      <h4 style={{ marginBottom: 4 }}>
                        {deal.type === "flash" && <span style={{ color: "#e02020" }}>🔥 FLASH DEAL — </span>}
                        {deal.title}
                      </h4>
                      <p style={{ margin: "4px 0", fontWeight: "bold" }}>{deal.discount_text}</p>
                      {deal.description && <p style={{ color: "#666", margin: "4px 0 8px" }}>{deal.description}</p>}
                      <p style={{ fontSize: 13, color: "#999", marginBottom: 10 }}>
                        <Link href={`/businesses/${deal.business_slug}`} title="">{deal.business_name}</Link>
                        {deal.type === "flash" && deal.expires_at && (
                          <>
                            {" "}
                            · expires{" "}
                            {new Date(deal.expires_at).toLocaleString(undefined, {
                              month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                            })}
                          </>
                        )}
                        {" "}· {deal.claim_count} claimed
                      </p>
                      {session ? (
                        <DealClaimButton
                          businessSlug={deal.business_slug}
                          dealId={deal.id}
                          isLoggedIn={Boolean(session)}
                          initialClaimed={hasClaimedDeal(deal.id, session.sub)}
                        />
                      ) : (
                        <Link href="/login" title="">Log in to claim</Link>
                      )}
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
