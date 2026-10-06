import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/db";
import { SOCIAL_NETWORKS } from "@/lib/social-links";
import SocialLinksForm from "./SocialLinksForm";

export const metadata: Metadata = {
  title: "Connect Accounts",
};

// Real tool: staff enter Pueblo Connect's social media addresses, which then show in the
// footer's Follow column on every page. It does not log in to those networks or post to
// them; posts are not shared to them automatically.
export const dynamic = "force-dynamic";

export default function Page() {
  const initial = getSiteSettings(SOCIAL_NETWORKS.map((n) => n.key));
  return (
    <div className="row">
      <div className="col-md-12" style={{ maxWidth: 720 }}>
        <h2 style={{ marginBottom: 12 }}>Connect Accounts</h2>
        <p style={{ color: "#555", marginBottom: 18 }}>
          Enter Pueblo Connect&rsquo;s social media addresses. They appear in the &ldquo;Follow&rdquo; column of
          the site footer, on every page. Leave a box empty to hide that network. This only adds links: it
          doesn&rsquo;t sign in to those sites, and posts are not shared to them automatically.
        </p>
        <SocialLinksForm initial={initial} />
      </div>
    </div>
  );
}
