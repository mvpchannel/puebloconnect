import type { Metadata } from "next";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/session";
import { getMembershipForUser } from "@/lib/db";
import MembershipPlans from "@/components/membership/MembershipPlans";

export const metadata: Metadata = {
  title: "Business Membership",
};

// Requires login — added to src/middleware.ts's MEMBER_ROUTES. A
// membership purchase belongs to a real account; there's no anonymous
// checkout.
export default function MembershipPage() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;
  const membership = session ? getMembershipForUser(session.sub) : undefined;
  const currentPlan =
    membership && membership.status === "active" ? membership.plan : null;

  return (
    <>
      <link rel="stylesheet" href="/css/membership.css" />
      <Header />
      <div className="membership-wrap">
        <div className="membership-header">
          <h1>Pueblo Connect Business Membership</h1>
          <p>
            Give your business a real presence on Pueblo Connect — a profile,
            directory listing, and a direct line to local customers. Cancel
            anytime.
          </p>
        </div>
        <MembershipPlans currentPlan={currentPlan} />
        {currentPlan && membership?.current_period_end && (
          <p style={{ textAlign: "center", marginTop: 24, color: "#666" }}>
            Your {currentPlan} membership is active through{" "}
            {new Date(membership.current_period_end).toLocaleDateString()}.
          </p>
        )}
      </div>
      <Footer />
    </>
  );
}
