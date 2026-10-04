import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ReportsHero from "@/components/ReportsHero";
import ReportsDashboard from "@/components/ReportsDashboard";
import ReportSubmitForm from "@/components/ReportSubmitForm";
import ReportsBrowser from "@/components/ReportsBrowser";
import { getCurrentUser } from "@/lib/require-user";
import { listNeighborhoodReports } from "@/lib/db";

export const metadata: Metadata = {
  title: "Report & Track",
};

// Real backend: src/app/api/reports/* and the neighborhood_reports/
// neighborhood_report_followers tables in src/lib/db.ts. "Track" an
// issue and you get a real email the moment its status changes — see
// ReportDetailClient. The stats/My-Reports panel below is real data
// (the signed-in member's own reports), not placeholder zeros.
export default async function ReportsPage() {
  const session = await getCurrentUser();
  const myReports = session
    ? listNeighborhoodReports({ reporterId: session.sub, limit: 100 }).map((r) => ({
        id: r.id,
        category: r.category,
        description: r.description,
        status: r.status,
        createdAt: r.created_at,
        hasPhoto: Boolean(r.has_photo),
      }))
    : [];

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
                <div style={{ marginBottom: 20 }}>
                  <ReportsHero />
                </div>
                <ReportsDashboard isLoggedIn={Boolean(session)} myReports={myReports} />
                <div id="report-form" style={{ marginTop: 20 }}>
                  <ReportSubmitForm isLoggedIn={Boolean(session)} />
                </div>
                <h4 style={{ margin: "20px 0 12px" }}>All Neighborhood Reports</h4>
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
