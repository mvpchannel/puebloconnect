import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Explore3DClient from "./Explore3DClient";
import PassportVisitBeacon from "@/components/PassportVisitBeacon";
import { listStorefronts } from "@/lib/db";
import { LANDMARKS, SAMPLE_BUSINESSES } from "@/lib/pueblo3d/places";
import { storefrontToPlace } from "@/lib/pueblo3d/storefronts";

export const metadata: Metadata = {
  title: "Explore the Pueblo in 3D",
};

// Member-only (enforced server-side in middleware.ts, not just by hiding
// the nav link) — the 3D city uses the real logged-in member's account,
// the same way /profile and /newsfeed do, rather than inventing a guest
// identity. That member-only gate is also why PassportVisitBeacon can
// safely pass isLoggedIn=true here without checking the session itself
// — middleware already guarantees it by the time this renders.
export const dynamic = "force-dynamic";

// Real businesses that an admin has given a 3D storefront replace the sample
// buildings; with none, the sample set is shown (and labeled as sample).
export default function Explore3DPage() {
  const storefronts = listStorefronts().map((b) =>
    storefrontToPlace({ ...b, storefront_lot: b.storefront_lot as number })
  );
  const places = [...LANDMARKS, ...(storefronts.length > 0 ? storefronts : SAMPLE_BUSINESSES)];
  return (
    <>
      <Header />
      <PassportVisitBeacon
        isLoggedIn
        category="explore_3d"
        refId={null}
        label="Explored the Pueblo in 3D"
      />
      <Explore3DClient places={places} />
      <Footer />
    </>
  );
}
