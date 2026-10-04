import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import BopVotingForm from "@/components/BopVotingForm";
import { getCurrentUser } from "@/lib/require-user";
import {
  getCurrentBopVotingPeriod,
  listBopCategories,
  listBusinesses,
  getBopUserVote,
  getBopCategoryTally,
  listAllBopWinners,
} from "@/lib/db";

export const metadata: Metadata = {
  title: "Best of the Pueblo",
};

// Voting (while a period is open) + a Hall of Fame of past winners.
// Real backend: src/app/api/best-of/*, src/lib/db.ts
// (bop_categories/bop_voting_periods/bop_votes/bop_winners tables).
export default async function BestOfPueblaPage() {
  const session = await getCurrentUser();
  const period = getCurrentBopVotingPeriod();
  const categories = listBopCategories();
  const businesses = listBusinesses().map((b) => ({ id: b.id, name: b.name }));
  const winners = listAllBopWinners();

  const initialVotes: Record<number, number | null> = {};
  const tallies: Record<number, { businessId: number; businessName: string; voteCount: number }[]> = {};
  if (period) {
    for (const category of categories) {
      initialVotes[category.id] = session ? getBopUserVote(period.id, category.id, session.sub) : null;
      tallies[category.id] = getBopCategoryTally(period.id, category.id).map((t) => ({
        businessId: t.business_id,
        businessName: t.business_name,
        voteCount: t.vote_count,
      }));
    }
  }

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
                <h3 style={{ marginBottom: 16 }}>Best of the Pueblo</h3>

                {period && categories.length > 0 ? (
                  <>
                    <p style={{ color: "#666", marginBottom: 16 }}>
                      Voting open now: <strong>{period.label}</strong>
                      {!session && (
                        <>
                          {" — "}
                          <Link href="/login" title="">log in</Link> to vote.
                        </>
                      )}
                    </p>
                    <BopVotingForm
                      periodId={period.id}
                      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                      businesses={businesses}
                      initialVotes={initialVotes}
                      tallies={tallies}
                      isLoggedIn={Boolean(session)}
                    />
                  </>
                ) : (
                  <div className="central-meta item">
                    <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                      No voting period is open right now.
                    </div>
                  </div>
                )}

                {winners.length > 0 && (
                  <>
                    <h4 style={{ margin: "24px 0 16px" }}>Hall of Fame</h4>
                    {winners.map((w) => (
                      <div className="central-meta item" key={w.id}>
                        <div style={{ padding: "12px 20px" }}>
                          <strong>{w.category_name}</strong> ({w.period_label}):{" "}
                          <Link href={`/businesses/${w.business_slug}`} title="">{w.business_name}</Link>
                          {" "}
                          <span style={{ color: "#999", fontSize: 13 }}>
                            — {w.vote_count} vote{w.vote_count === 1 ? "" : "s"}
                          </span>
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
