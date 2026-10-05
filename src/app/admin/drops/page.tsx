import type { Metadata } from "next";
import { listPuebloDropsForAdmin, listClaimsForDrop } from "@/lib/db";
import { DROP_SPOTS } from "@/lib/pueblo3d/places";
import DropsAdminPanel from "@/components/admin/DropsAdminPanel";

export const metadata: Metadata = { title: "Treasure drops" };
export const dynamic = "force-dynamic";

// Hide treasures in the 3D Pueblo and verify claim codes when members redeem.
// Gated to admins by src/middleware.ts plus each route's requireAdmin check.
export default function DropsAdminPage() {
  const drops = listPuebloDropsForAdmin();
  const spotLabel = (x: number, z: number) => DROP_SPOTS.find((s) => s.x === x && s.z === z)?.label ?? `(${x}, ${z})`;
  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 20 }}>Treasure drops</h2>
        <p style={{ color: "#888", marginBottom: 20 }}>
          A treasure appears as a glowing gem at its hiding spot in Explore the Pueblo in 3D. A member who finds it gets a
          short code, which they show to redeem the prize you describe. Points are added automatically; the prize itself
          is handed over by whoever you named, so check the code here and mark it redeemed.
        </p>
        <DropsAdminPanel
          spots={DROP_SPOTS.map((s) => ({ id: s.id, label: s.label }))}
          drops={drops.map((d) => ({
            id: d.id,
            title: d.title,
            prizeText: d.prize_text,
            kind: d.kind,
            spot: spotLabel(d.x, d.z),
            points: d.points,
            maxClaims: d.max_claims,
            expiresAt: d.expires_at,
            active: Boolean(d.active),
            claims: listClaimsForDrop(d.id).map((c) => ({
              id: c.id,
              code: c.code,
              member: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.username,
              claimedAt: c.claimed_at,
              redeemed: Boolean(c.redeemed_at),
            })),
          }))}
        />
      </div>
    </div>
  );
}
