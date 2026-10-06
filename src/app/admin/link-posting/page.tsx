import type { Metadata } from "next";
import Link from "next/link";
import LinkForm from "./LinkForm";

export const metadata: Metadata = {
  title: "Share a Link",
};

// Real tool: staff post a web address to the newsfeed under their own account.
// The post shows a rich preview card (picture, title, description) built from
// the page; staff can edit the card text or upload their own picture first.
export default function Page() {
  return (
    <div className="row">
      <div className="col-md-12" style={{ maxWidth: 720 }}>
        <h2 style={{ marginBottom: 12 }}>Share a Link</h2>
        <p style={{ color: "#555", marginBottom: 18 }}>
          Paste a link to a story, deal or event. We read the page and build a preview card with its picture, title and
          description. You can fix the wording or swap the picture before it goes on the newsfeed. The card opens the
          link in a new tab. To remove a post, use <Link href="/admin/posting-panel">Create a post</Link>, which lists
          the latest posts with a Delete button.
        </p>
        <LinkForm />
      </div>
    </div>
  );
}
