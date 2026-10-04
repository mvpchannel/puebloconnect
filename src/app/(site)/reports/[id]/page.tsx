import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import ReportDetailClient from "@/components/ReportDetailClient";
import { getCurrentUser } from "@/lib/require-user";
import { getNeighborhoodReportById, isFollowingReport } from "@/lib/db";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = Number(params.id);
  const report = Number.isInteger(id) ? getNeighborhoodReportById(id) : undefined;
  return { title: report ? report.description.slice(0, 60) : "Report" };
}

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const report = getNeighborhoodReportById(id);
  if (!report) notFound();

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
                <ReportDetailClient
                  isLoggedIn={Boolean(session)}
                  isAdmin={session?.role === "admin"}
                  initialReport={{
                    id: report.id,
                    reporterName:
                      [report.reporter_first_name, report.reporter_last_name].filter(Boolean).join(" ") ||
                      report.reporter_username,
                    category: report.category,
                    description: report.description,
                    photoUrl: report.photo_url,
                    locationText: report.location_text,
                    latitude: report.latitude,
                    longitude: report.longitude,
                    status: report.status,
                    resolutionNote: report.resolution_note,
                    createdAt: report.created_at,
                    followerCount: report.follower_count,
                    followedByViewer: session ? isFollowingReport(report.id, session.sub) : false,
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
