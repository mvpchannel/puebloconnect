import type { Metadata } from "next";
import Link from "next/link";
import LinkForm from "./LinkForm";

export const metadata: Metadata = {
  title: "Share a Link",
};

// Real tool: staff post a web address (with an optional note) to the newsfeed under
// their own account. The newsfeed shows the address as a clickable link; there is no
// picture or title preview card yet.
export default function Page() {
  return (
    <div className="row">
      <div className="col-md-12" style={{ maxWidth: 720 }}>
        <h2 style={{ marginBottom: 12 }}>Share a Link</h2>
        <p style={{ color: "#555", marginBottom: 18 }}>
          Post a link to a story, deal or event on the newsfeed. It appears under your own account and opens in a
          new tab. It shows as a plain link, with no picture or title preview yet. To remove a post, use{" "}
          <Link href="/admin/posting-panel">Create a post</Link>, which lists the latest posts with a Delete button.
        </p>
        <LinkForm />
      </div>
    </div>
  );
}
