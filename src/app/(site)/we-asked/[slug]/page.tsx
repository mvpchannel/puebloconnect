import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import PuebloAnswerForm from "@/components/PuebloAnswerForm";
import { getCurrentUser } from "@/lib/require-user";
import { getPublicPuebloQuestionBySlug, listApprovedPuebloAnswers, getPuebloAnswerForUser } from "@/lib/db";
import { answerAuthorLabel } from "@/lib/we-asked";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const q = getPublicPuebloQuestionBySlug(params.slug);
  return { title: q ? q.question : "We Asked the Pueblo" };
}

export default async function WeAskedQuestionPage({ params }: { params: { slug: string } }) {
  const q = getPublicPuebloQuestionBySlug(params.slug);
  if (!q) notFound();
  const session = await getCurrentUser();
  const answers = listApprovedPuebloAnswers(q.id);
  const mine = session ? getPuebloAnswerForUser(q.id, session.sub) : undefined;

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
                <p style={{ marginBottom: 6 }}><Link href="/we-asked" title="">&larr; We Asked the Pueblo</Link></p>
                <h3 style={{ marginBottom: 6 }}>{q.question}</h3>
                {q.context && <p style={{ color: "#666" }}>{q.context}</p>}

                <div className="central-meta item" style={{ padding: 20 }}>
                  {q.status !== "open" ? (
                    <p style={{ margin: 0, color: "#888" }}>This question is closed to new answers.</p>
                  ) : session ? (
                    <PuebloAnswerForm
                      questionId={q.id}
                      existing={mine ? { body: mine.body, status: mine.status } : null}
                    />
                  ) : (
                    <p style={{ margin: 0 }}><Link href="/login" title="">Log in</Link> to add your answer.</p>
                  )}
                </div>

                <h5 style={{ margin: "18px 0 8px" }}>
                  {answers.length} {answers.length === 1 ? "answer" : "answers"}
                </h5>
                {answers.map((a) => (
                  <div className="central-meta item" key={a.id}>
                    <div style={{ padding: "14px 20px" }}>
                      {a.selected ? <div style={{ fontSize: 12, color: "#d98c00", fontWeight: 600 }}>STAFF PICK</div> : null}
                      <p style={{ marginBottom: 6, whiteSpace: "pre-wrap" }}>{a.body}</p>
                      <div style={{ fontSize: 13, color: "#888" }}>
                        {answerAuthorLabel(a)}{a.city ? ` · ${a.city}` : ""}
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
