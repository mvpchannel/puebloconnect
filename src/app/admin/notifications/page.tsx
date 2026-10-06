import type { Metadata } from "next";
import AdminInfoPage from "@/components/admin/AdminInfoPage";

export const metadata: Metadata = {
  title: "Notifications",
};

// An honest placeholder: this admin tool is not built yet. It replaces the old
// vendor-template demo screen (made-up names and numbers).
export default function Page() {
  return (
    <AdminInfoPage
      title="Notifications"
      purpose="Send and review notifications to members from the admin panel."
      status="Not built yet"
      today={[
        "Members already get their own notifications automatically (friend requests, comments, likes and when a host they follow goes live) and can read them on the Notifications page.",
        "Members choose which emails they get in Account settings.",
        "There is no tool yet for staff to send a notification to everyone.",
      ]}
      links={[
          { href: "/notifications", label: "Open member notifications" },
          { href: "/account-settings", label: "Email preferences" },
      ]}
    />
  );
}
