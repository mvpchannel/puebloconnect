import type { Metadata } from "next";
import AdminInfoPage from "@/components/admin/AdminInfoPage";

export const metadata: Metadata = {
  title: "Edit Profile",
};

// An honest placeholder: this admin tool is not built yet. It replaces the old
// vendor-template demo screen (made-up names and numbers).
export default function Page() {
  return (
    <AdminInfoPage
      title="Edit Profile"
      purpose="Change your own name, photo and details."
      status="Use Account settings"
      today={[
        "Staff edit their profile the same way members do: name, city, bio, profile photo and cover photo, in Account settings.",
        "Passwords and email preferences are in the same place.",
      ]}
      links={[
          { href: "/account-settings#profile", label: "Edit my profile" },
      ]}
    />
  );
}
