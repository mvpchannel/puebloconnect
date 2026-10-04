import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import BoothAnswerPanel from "@/components/BoothAnswerPanel";
import { getCurrentUser } from "@/lib/require-user";
import { getCurrentBoothQuestion, listBoothAnswersForQuestion, getUserBoothAnswer } from "@/lib/db";

export const metadata: Metadata = {
  title: "The Pueblo Booth",
};

// This week's community question + answers. Real backend:
// src/app/api/booth/* and the booth_questions/booth_answers tables in
// src/lib/db.ts.
export default async function BoothPage() {
  const session = await getCurrentUser();
  const question = getCurrentBoothQuestion();
  const answers = question ? listBoothAnswersForQuestion(question.id) : [];
  const myAnswer = question && session ? getUserBoothAnswer(question.id, session.sub) : undefined;

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
                <h3 style={{ marginBottom: 4 }}>The Pueblo Booth</h3>
                {!question && (
                  <div className="central-meta item">
                    <div style={{ padding: "24px", textAlign: "center", color: "#888" }}>
                      No question has been posted yet — check back soon.
                    </div>
                  </div>
                )}
                {question && (
                  <>
                    <p style={{ fontSize: 18, fontWeight: 600, margin: "4px 0 20px" }}>
                      {question.question_text}
                    </p>
                    <BoothAnswerPanel
                      questionId={question.id}
                      isOpen={Boolean(question.is_open)}
                      isLoggedIn={Boolean(session)}
                      initialAnswers={answers.map((a) => ({
                        id: a.id,
                        userId: a.user_id,
                        answerType: a.answer_type,
                        answerText: a.answer_text,
                        mediaUrl: a.media_url,
                        createdAt: a.created_at,
                        name: [a.first_name, a.last_name].filter(Boolean).join(" ") || a.username,
                        profilePhotoPath: a.profile_photo_path,
                      }))}
                      initialMyAnswer={
                        myAnswer
                          ? {
                              answerType: myAnswer.answer_type,
                              answerText: myAnswer.answer_text,
                              mediaUrl: myAnswer.media_url,
                              updatedAt: myAnswer.updated_at,
                            }
                          : null
                      }
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
