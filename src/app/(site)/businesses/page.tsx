import type { Metadata } from "next";
import { PLACEHOLDER } from "@/lib/placeholders";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import BusinessCreateForm from "@/components/BusinessCreateForm";
import { getCurrentUser } from "@/lib/require-user";
import { listBusinesses } from "@/lib/db";

export const metadata: Metadata = {
  title: "Business Channels",
};

// Browse + create business channels — the real directory, replacing the
// decorative /admin/locations mockup. Real backend:
// src/app/api/businesses/route.ts, src/lib/db.ts (businesses table).
export default async function BusinessesPage() {
  const session = await getCurrentUser();
  const businesses = listBusinesses();

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
                <h3 style={{ marginBottom: 16 }}>Business Channels</h3>
                {session ? (
                  <BusinessCreateForm />
                ) : (
                  <div className="central-meta item" style={{ padding: "20px", textAlign: "center" }}>
                    <Link href="/login" title="">Log in</Link> to create a business channel.
                  </div>
                )}

                {businesses.length === 0 && (
                  <div className="central-meta item">
                    <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                      No business channels yet — be the first to create one.
                    </div>
                  </div>
                )}

                {businesses.map((business) => (
                  <div className="central-meta item" key={business.id}>
                    <div style={{ padding: "16px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                      <img src={business.logo_path || PLACEHOLDER.businessLogo} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 12, flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                      <h4 style={{ marginBottom: 4 }}>
                        <Link href={`/businesses/${business.slug}`} title="">{business.name}</Link>
                      </h4>
                      <span style={{ color: "#999", fontSize: 13 }}>{business.category}</span>
                      {business.description && (
                        <p style={{ color: "#666", margin: "4px 0 8px" }}>{business.description}</p>
                      )}
                      <span style={{ color: "#999", fontSize: 13 }}>
                        {business.follower_count} follower{business.follower_count === 1 ? "" : "s"} ·{" "}
                        {business.post_count} post{business.post_count === 1 ? "" : "s"}
                        {business.review_count > 0 && (
                          <>
                            {" "}
                            · {business.average_rating?.toFixed(1)}★ ({business.review_count})
                          </>
                        )}
                      </span>
                      </div>
                    </div>
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
