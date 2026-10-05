import type { Metadata } from "next";
import { PLACEHOLDER } from "@/lib/placeholders";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { listSpotlights } from "@/lib/db";

export const metadata: Metadata = {
  title: "Pueblo Business Spotlight",
  description: "Feature stories about the local businesses and people that make the Pueblo what it is.",
};

export const dynamic = "force-dynamic";

// Public listing of published Business Spotlight stories (written in the
// admin: /admin/spotlights).
export default function SpotlightIndexPage() {
  const items = listSpotlights({ publishedOnly: true });

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
                <h3 style={{ marginBottom: 4 }}>Pueblo Business Spotlight</h3>
                <p style={{ color: "#888", marginBottom: 16 }}>
                  The story behind a local business — its owner, its history, its products and its place in the community.
                </p>

                {items.length === 0 && (
                  <div className="central-meta item">
                    <div style={{ padding: 24, textAlign: "center", color: "#888" }}>
                      No spotlights yet — check back soon, or{" "}
                      <Link href="/businesses" title="">browse local businesses</Link>.
                    </div>
                  </div>
                )}

                {items.map((s) => (
                  <div className="central-meta item" key={s.id}>
                    <Link href={`/spotlight/${s.slug}`} title="" style={{ display: "block", color: "inherit" }}>
                      <img src={s.hero_image_path || PLACEHOLDER.spotlight} alt="" style={{ width: "100%", height: 240, objectFit: "cover", display: "block" }} />
                      <div style={{ padding: "16px 20px" }}>
                        {s.sponsored ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#7b8794", textTransform: "uppercase", letterSpacing: ".06em" }}>Sponsored feature</span>
                        ) : null}
                        <h4 style={{ margin: "2px 0 6px" }}>{s.title}</h4>
                        <p style={{ margin: "0 0 6px", color: "#555" }}>{s.summary}</p>
                        <p style={{ margin: 0, fontSize: 13, color: "#999" }}>
                          {s.business_name ?? s.owner_name ?? ""}
                        </p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
