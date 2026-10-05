import type { Metadata } from "next";
import { listBusinessesWithTourState } from "@/lib/db";
import TourAdminPanel from "@/components/admin/TourAdminPanel";

export const metadata: Metadata = { title: "Virtual tours" };
export const dynamic = "force-dynamic";

// Attach a 360° / virtual tour link to a business. Gated to admins by
// src/middleware.ts plus the route's requireAdmin check.
export default function ToursAdminPage() {
  const rows = listBusinessesWithTourState();
  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 20 }}>Virtual tours</h2>
        <p style={{ color: "#888", marginBottom: 20 }}>
          Paste a tour link for a business: a Matterport share link, or a YouTube or Vimeo video (including 360° videos).
          Only those three are accepted. The business then gets a public tour page and a &ldquo;Take a virtual tour&rdquo;
          button on its profile.
        </p>
        <TourAdminPanel rows={rows.map((b) => ({ id: b.id, name: b.name, category: b.category, tourUrl: b.tour_url }))} />
      </div>
    </div>
  );
}
