import type { Metadata } from "next";
import AdminInfoPage from "@/components/admin/AdminInfoPage";

export const metadata: Metadata = {
  title: "Share a Link",
};

// An honest placeholder: this admin tool is not built yet. It replaces the old
// vendor-template demo screen (made-up names and numbers).
export default function Page() {
  return (
    <AdminInfoPage
      title="Share a Link"
      purpose="Post a link to a story, deal or event as Pueblo Connect staff."
      status="Not built yet"
      today={[
        "Staff can post to the newsfeed the same way members do, with text, a photo or a video.",
        "Staff can create tracked QR codes that open any page on the site (QR codes in the admin menu).",
      ]}
      links={[
          { href: "/newsfeed", label: "Go to the newsfeed" },
          { href: "/admin/qr-links", label: "QR codes" },
      ]}
    />
  );
}
