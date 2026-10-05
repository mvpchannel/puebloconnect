import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { listBusinessTours } from "@/lib/db";
import { TOUR_PROVIDER_LABEL } from "@/lib/tour-url";

export const metadata: Metadata = {
  title: "360° Virtual Business Tours",
  description: "Step inside Pueblo businesses with virtual tours.",
};
export const dynamic = "force-dynamic";

export default function ToursPage() {
  const tours = listBusinessTours();
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
                <h3 style={{ marginBottom: 4 }}>360° Virtual Business Tours</h3>
                <p style={{ color: "#888", marginBottom: 14 }}>Look around a business before you visit.</p>
                {tours.length === 0 && (
                  <div className="central-meta item">
                    <div style={{ padding: 24, textAlign: "center", color: "#888" }}>
                      No tours yet. Interested in one for your business? <Link href="/360-advertising" title="">Ask us</Link>.
                    </div>
                  </div>
                )}
                {tours.map((t) => (
                  <div className="central-meta item" key={t.business_id}>
                    <div style={{ padding: "14px 20px" }}>
                      <h4 style={{ marginBottom: 2 }}><Link href={`/tours/${t.slug}`} title="">{t.name}</Link></h4>
                      <div style={{ fontSize: 13, color: "#888" }}>
                        {t.category && <>{t.category} · </>}via {TOUR_PROVIDER_LABEL[t.tour_provider]}
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
