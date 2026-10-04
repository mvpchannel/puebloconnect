import type { Metadata } from "next";
import { listBopCategories, listBopVotingPeriods } from "@/lib/db";
import BopAdminPanel from "@/components/admin/BopAdminPanel";

export const metadata: Metadata = {
  title: "Best of the Pueblo",
};

// Real admin feature, not a mockup — see src/lib/db.ts
// (bop_categories/bop_voting_periods) and src/app/api/best-of/*. Gated
// to admins by src/middleware.ts (ADMIN_ROUTES covers /admin/:path*)
// plus each route's own requireAdmin check.
export default function BopAdminPage() {
  const categories = listBopCategories();
  const periods = listBopVotingPeriods();

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 20 }}>Best of the Pueblo</h2>
        <p style={{ color: "#888", marginBottom: 20 }}>
          Manage voting categories and periods. Closing a period snapshots each category&apos;s
          leading business as its winner — later votes never change a closed period&apos;s result.
        </p>
        <BopAdminPanel
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          periods={periods.map((p) => ({
            id: p.id,
            label: p.label,
            isOpen: Boolean(p.is_open),
            closedAt: p.closed_at,
          }))}
        />
      </div>
    </div>
  );
}
