import type { Metadata } from "next";
import { listSpotlights, listBusinesses } from "@/lib/db";
import SpotlightAdminPanel from "@/components/admin/SpotlightAdminPanel";

export const metadata: Metadata = {
  title: "Business Spotlight",
};

export const dynamic = "force-dynamic";

// Admin-written Business Spotlight features. Real backend: spotlights table
// (src/lib/db.ts), /api/admin/spotlights/*. Gated to admins by
// src/middleware.ts plus each route's requireAdmin check.
export default function SpotlightAdminPage() {
  const spotlights = listSpotlights({ publishedOnly: false });
  const businesses = listBusinesses(500);

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 20 }}>Business Spotlight</h2>
        <p style={{ color: "#888", marginBottom: 20 }}>
          Write a feature story about a local business. Drafts stay private until you publish; published
          stories appear on the public Spotlight page.
        </p>
        <SpotlightAdminPanel
          spotlights={spotlights.map((s) => ({
            id: s.id,
            slug: s.slug,
            title: s.title,
            summary: s.summary,
            ownerName: s.owner_name ?? "",
            body: s.body,
            businessId: s.business_id,
            businessName: s.business_name,
            heroImagePath: s.hero_image_path,
            sponsored: Boolean(s.sponsored),
            published: s.status === "published",
          }))}
          businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
        />
      </div>
    </div>
  );
}
