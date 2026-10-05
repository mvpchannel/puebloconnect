// Public display name for an answer: "Maria G." (first name + last initial),
// falling back to the username. Never the email.
export function answerAuthorLabel(a: { first_name: string | null; last_name: string | null; username: string }): string {
  const first = a.first_name?.trim();
  if (first) {
    const initial = a.last_name?.trim()?.[0];
    return initial ? `${first} ${initial.toUpperCase()}.` : first;
  }
  return a.username;
}

export const ANSWER_MAX = 1000;

export function parseQuestionBody(
  body: Record<string, unknown>
): { input: { question: string; context: string | null; status: "draft" | "open" | "closed" } } | { error: string } {
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const context = typeof body.context === "string" ? body.context.trim() : "";
  if (!question || question.length > 200) return { error: "Enter the question (200 characters max)." };
  if (context.length > 1000) return { error: "The extra context is too long (1000 characters max)." };
  const status = body.status;
  if (status !== "draft" && status !== "open" && status !== "closed") return { error: "Choose draft, open or closed." };
  return { input: { question, context: context || null, status } };
}
