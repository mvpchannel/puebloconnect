import type { Metadata } from "next";
import { listBoothQuestions } from "@/lib/db";
import BoothAdminPanel from "@/components/admin/BoothAdminPanel";

export const metadata: Metadata = {
  title: "The Pueblo Booth",
};

// Real admin feature — see src/lib/db.ts (booth_questions/booth_answers)
// and src/app/api/admin/booth/*. Gated to admins by src/middleware.ts
// (ADMIN_ROUTES covers /admin/:path*) plus each route's own requireAdmin
// check.
export default function BoothAdminPage() {
  const questions = listBoothQuestions();

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 20 }}>The Pueblo Booth</h2>
        <p style={{ color: "#888", marginBottom: 20 }}>
          Open this week&apos;s community question. Members answer with text,
          video, or audio — one answer each, editable until the question
          closes.
        </p>
        <BoothAdminPanel
          initialQuestions={questions.map((q) => ({
            id: q.id,
            questionText: q.question_text,
            opensAt: q.opens_at,
            closesAt: q.closes_at,
            isOpen: Boolean(q.is_open),
            answerCount: q.answer_count,
          }))}
        />
      </div>
    </div>
  );
}
