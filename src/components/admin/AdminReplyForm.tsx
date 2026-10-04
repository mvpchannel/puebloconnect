"use client";

/**
 * Shared "Reply To Comment" ticket-reply form used by admin/tickets-1.
 * Ported from a `<button type="submit">` that wasn't wrapped in any
 * `<form>` in the original markup (a real HTML bug, not just a
 * no-backend placeholder — clicking it did nothing even as a no-op,
 * since there was no form to submit).
 *
 * STATUS: needs backend/API — no ticketing system exists yet; submit is a
 * no-op (e.preventDefault()).
 */
export default function AdminReplyForm() {
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <textarea placeholder="Reply To Comment"></textarea>
      <button type="submit" className="purple-skin rply">Reply</button>
    </form>
  );
}
