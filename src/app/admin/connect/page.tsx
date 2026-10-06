import type { Metadata } from "next";
import AdminInfoPage from "@/components/admin/AdminInfoPage";

export const metadata: Metadata = {
  title: "Connect Accounts",
};

// An honest placeholder: this admin tool is not built yet. It replaces the old
// vendor-template demo screen (made-up names and numbers).
export default function Page() {
  return (
    <AdminInfoPage
      title="Connect Accounts"
      purpose="Link Pueblo Connect's social media accounts so posts can be shared to them."
      status="Not built yet"
      today={[
        "Members add each other as friends on the Friends page.",
        "The Facebook, Twitter and Instagram links in the site footer are not set yet, because no account addresses have been entered.",
      ]}
      links={[
          { href: "/friends", label: "Friends" },
      ]}
    />
  );
}
