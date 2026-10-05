import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Explore3DClient from "./Explore3DClient";
import PassportVisitBeacon from "@/components/PassportVisitBeacon";
import { listStorefronts, listActiveDealsForBusiness, listFindableDrops, listStreams } from "@/lib/db";
import { getCurrentUser } from "@/lib/require-user";
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
export default async function Explore3DPage() {
  const storefronts = listStorefronts().map((b) => {
    const deal = listActiveDealsForBusiness(b.id)[0] ?? null;
    return storefrontToPlace({ ...b, storefront_lot: b.storefront_lot as number }, deal);
  });
  const session = await getCurrentUser();
  const drops = session
    ? listFindableDrops(session.sub).map((d) => ({ id: d.id, x: d.x, z: d.z, golden: d.kind === "golden_ticket" }))
    : [];
  const live = listStreams("live", session?.sub ?? null, 1)[0];
  const screen = live
    ? { headline: "● LIVE NOW", status: live.title }
    : { headline: "PUEBLO LIVE", status: "No broadcast right now" };
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
      <Explore3DClient places={places} drops={drops} screen={screen} />
      <Footer />
    </>
  );
}
