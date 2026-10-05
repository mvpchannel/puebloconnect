import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { listPuebloQuestions } from "@/lib/db";

export const metadata: Metadata = {
  title: "We Asked the Pueblo",
  description: "Residents answer questions about neighborhoods, schools, businesses and culture.",
};

export const dynamic = "force-dynamic";

// Public. Open and closed questions; drafts never show.
export default function WeAskedPage() {
  const questions = listPuebloQuestions({ publicOnly: true });
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
                <h3 style={{ marginBottom: 4 }}>We Asked the Pueblo</h3>
                <p style={{ color: "#888", marginBottom: 14 }}>
                  Residents answer questions about neighborhoods, schools, businesses and culture. Selected answers also
                  appear in The Daily Pueblo.
                </p>
                {questions.length === 0 && (
                  <div className="central-meta item">
                    <div style={{ padding: 24, textAlign: "center", color: "#888" }}>No questions yet. Check back soon.</div>
                  </div>
                )}
                {questions.map((q) => (
                  <div className="central-meta item" key={q.id}>
                    <div style={{ padding: "16px 20px" }}>
                      <h4 style={{ marginBottom: 4 }}>
                        <Link href={`/we-asked/${q.slug}`} title="">{q.question}</Link>
                      </h4>
                      <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
                        <strong style={{ color: q.status === "open" ? "#1f9d55" : "#888" }}>
                          {q.status === "open" ? "Open for answers" : "Closed"}
                        </strong>
                        {" · "}{q.approved_count} {q.approved_count === 1 ? "answer" : "answers"}
                      </p>
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
