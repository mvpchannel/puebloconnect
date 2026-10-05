import type { Metadata } from "next";
import { listPuebloQuestions, listPuebloAnswersForAdmin } from "@/lib/db";
import { answerAuthorLabel } from "@/lib/we-asked";
import WeAskedAdminPanel from "@/components/admin/WeAskedAdminPanel";

export const metadata: Metadata = { title: "We Asked the Pueblo" };
export const dynamic = "force-dynamic";

// Post questions, review resident answers before they go public, and mark
// the ones selected for The Daily Pueblo. Gated to admins by src/middleware.ts
// plus each route's requireAdmin check.
export default function WeAskedAdminPage() {
  const questions = listPuebloQuestions({ publicOnly: false });
  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 20 }}>We Asked the Pueblo</h2>
        <p style={{ color: "#888", marginBottom: 20 }}>
          Answers stay hidden until you approve them. Approved answers you select are marked as staff picks on the
          public page, so you can find them when assembling the print edition.
        </p>
        <WeAskedAdminPanel
          questions={questions.map((q) => ({
            id: q.id,
            slug: q.slug,
            question: q.question,
            context: q.context ?? "",
            status: q.status,
            answers: listPuebloAnswersForAdmin(q.id).map((a) => ({
              id: a.id,
              body: a.body,
              author: answerAuthorLabel(a),
              status: a.status,
              selected: Boolean(a.selected),
            })),
          }))}
        />
      </div>
    </div>
  );
}
