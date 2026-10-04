import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import NearbyMembersClient from "@/components/NearbyMembersClient";
import { getCurrentUser } from "@/lib/require-user";
import { getUserById } from "@/lib/db";

export const metadata: Metadata = {
  title: "Members Near You",
};

// Real backend: src/lib/geo.ts (haversine distance + bounding box +
// IP2Location lookup) and src/lib/db.ts (updateUserLocation/
// findNearbyUsers). Gated to logged-in members by src/middleware.ts.
export default async function NearbyPage() {
  const session = await getCurrentUser();
  if (!session) {
    return (
      <>
        <Header />
        <section>
          <div className="gap gray-bg">
            <div className="container">
              <div style={{ padding: 40, textAlign: "center" }}>
                <Link href="/login" title="">Log in</Link> to find members near you.
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  const user = getUserById(session.sub)!;

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
                <h3 style={{ marginBottom: 16 }}>Members Near You</h3>
                <NearbyMembersClient
                  initialLocation={{
                    latitude: user.latitude,
                    longitude: user.longitude,
                    city: user.location_city,
                    region: user.location_region,
                    source: user.location_source,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
