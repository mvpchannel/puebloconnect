import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ReportSubmitForm from "@/components/ReportSubmitForm";
import ReportsBrowser from "@/components/ReportsBrowser";
import { getCurrentUser } from "@/lib/require-user";

export const metadata: Metadata = {
  title: "Report & Track",
};

// Real backend: src/app/api/reports/* and the neighborhood_reports/
// neighborhood_report_followers tables in src/lib/db.ts. "Track" an
// issue and you get a real email the moment its status changes — see
// ReportDetailClient.
export default async function ReportsPage() {
  const session = await getCurrentUser();

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
                <h3 style={{ marginBottom: 4 }}>Report &amp; Track</h3>
                <p style={{ color: "#888", marginBottom: 16 }}>
                  See a street light out, a dumped item, or a traffic hazard? Report it here and track what happens.
                </p>
                <ReportSubmitForm isLoggedIn={Boolean(session)} />
                <ReportsBrowser isLoggedIn={Boolean(session)} />
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
