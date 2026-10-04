import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import RewardsPanel from "@/components/RewardsPanel";
import { getCurrentUser } from "@/lib/require-user";
import {
  getTotalPointsForUser,
  listPointEventsForUser,
  getRewardsLevelsForUser,
  getCurrentRewardsLevel,
  listRewardsLeaderboard,
  REWARDS_ACTION_LABELS,
} from "@/lib/db";

export const metadata: Metadata = {
  title: "Pueblo Rewards",
};

// Member-only (enforced in middleware.ts, same as /profile and
// /passport) — the unifying points system. Every other feature built
// this round (posts, following a business, reviews, RSVPs, check-ins,
// deal claims, Best of the Pueblo votes, Booth answers, approved
// Street Team submissions, Passport stamps) feeds points here — see
// the awardPoints call sites in src/lib/db.ts.
export default async function RewardsPage() {
  const session = await getCurrentUser();

  const totalPoints = session ? getTotalPointsForUser(session.sub) : 0;
  const levels = session ? getRewardsLevelsForUser(session.sub) : [];
  const currentLevel = session ? getCurrentRewardsLevel(session.sub) : null;
  const history = session ? listPointEventsForUser(session.sub, 50) : [];
  const leaderboard = listRewardsLeaderboard(10);

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
                <h3 style={{ marginBottom: 4 }}>Pueblo Rewards</h3>
                <p style={{ color: "#888", marginBottom: 20 }}>
                  Earn points by using Pueblo Connect — posting, following businesses, leaving
                  reviews, RSVPing to events, checking in, claiming deals, voting in Best of the
                  Pueblo, answering The Pueblo Booth, getting Street Team submissions approved,
                  and collecting Passport stamps.
                </p>
                {currentLevel && (
                  <RewardsPanel
                    totalPoints={totalPoints}
                    levels={levels}
                    currentLevel={currentLevel}
                    history={history.map((h) => ({
                      id: h.id,
                      action: h.action,
                      label: REWARDS_ACTION_LABELS[h.action] ?? h.action,
                      points: h.points,
                      createdAt: h.created_at,
                    }))}
                    leaderboard={leaderboard.map((row) => ({
                      userId: row.user_id,
                      name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.username,
                      totalPoints: row.total_points,
                    }))}
                    viewerId={session?.sub ?? null}
                  />
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
