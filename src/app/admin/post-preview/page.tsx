import type { Metadata } from "next";
import AdminInfoPage from "@/components/admin/AdminInfoPage";

export const metadata: Metadata = {
  title: "Preview a Post",
};

// An honest placeholder: this admin tool is not built yet. It replaces the old
// vendor-template demo screen (made-up names and numbers).
export default function Page() {
  return (
    <AdminInfoPage
      title="Preview a Post"
      purpose="See how a post will look before it is published."
      status="Not built yet"
      today={[
        "Posts are published straight from the box at the top of the newsfeed. There is no preview step yet.",
      ]}
      links={[
          { href: "/newsfeed", label: "Go to the newsfeed" },
      ]}
    />
  );
}
