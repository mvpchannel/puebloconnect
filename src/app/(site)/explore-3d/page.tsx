import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Explore3DClient from "./Explore3DClient";
import PassportVisitBeacon from "@/components/PassportVisitBeacon";

export const metadata: Metadata = {
  title: "Explore the Pueblo in 3D",
};

// Member-only (enforced server-side in middleware.ts, not just by hiding
// the nav link) — the 3D city uses the real logged-in member's account,
// the same way /profile and /newsfeed do, rather than inventing a guest
// identity. That member-only gate is also why PassportVisitBeacon can
// safely pass isLoggedIn=true here without checking the session itself
// — middleware already guarantees it by the time this renders.
export default function Explore3DPage() {
  return (
    <>
      <Header />
      <PassportVisitBeacon
        isLoggedIn
        category="explore_3d"
        refId={null}
        label="Explored the Pueblo in 3D"
      />
      <Explore3DClient />
      <Footer />
    </>
  );
}
