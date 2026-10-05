import type { Metadata } from "next";
import { listBusinessesWithStorefrontState, STOREFRONT_LOTS } from "@/lib/db";
import { DEFAULT_STOREFRONT_COLOR } from "@/lib/pueblo3d/storefronts";
import StorefrontAdminPanel from "@/components/admin/StorefrontAdminPanel";

export const metadata: Metadata = { title: "3D storefronts" };
export const dynamic = "force-dynamic";

// Choose which businesses get a building in the 3D Pueblo and what color it is.
// Gated to admins by src/middleware.ts plus the route's requireAdmin check.
export default function StorefrontsAdminPage() {
  const rows = listBusinessesWithStorefrontState();
  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 20 }}>3D storefronts</h2>
        <p style={{ color: "#888", marginBottom: 20 }}>
          A business added here gets a building in Explore the Pueblo in 3D that opens its business page. While no
          business has a storefront, the 3D Pueblo shows labeled sample buildings instead. Each storefront takes one of
          {" "}{STOREFRONT_LOTS} lots. A storefront shows a rooftop billboard: the headline you set here, or else the business's current deal if it has one, or no billboard.
        </p>
        <StorefrontAdminPanel
          totalLots={STOREFRONT_LOTS}
          rows={rows.map((b) => ({
            id: b.id,
            name: b.name,
            category: b.category,
            lot: b.storefront_lot,
            color: b.storefront_color ?? DEFAULT_STOREFRONT_COLOR,
            billboard: b.billboard_text ?? "",
          }))}
        />
      </div>
    </div>
  );
}
