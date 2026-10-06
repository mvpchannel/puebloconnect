import type { Metadata } from "next";
import AdminInfoPage from "@/components/admin/AdminInfoPage";

export const metadata: Metadata = {
  title: "Create a Post",
};

// An honest placeholder: this admin tool is not built yet. It replaces the old
// vendor-template demo screen (made-up names and numbers).
export default function Page() {
  return (
    <AdminInfoPage
      title="Create a Post"
      purpose="A staff panel for writing, editing and scheduling posts."
      status="Not built yet"
      today={[
        "Posts with text, a photo or a video are written in the box at the top of the newsfeed.",
        "Members can delete their own posts. A separate editing and scheduling panel for staff does not exist yet.",
      ]}
      links={[
          { href: "/newsfeed", label: "Go to the newsfeed" },
      ]}
    />
  );
}
