import type { Metadata } from "next";
import AdminInfoPage from "@/components/admin/AdminInfoPage";

export const metadata: Metadata = {
  title: "Post a Photo",
};

// An honest placeholder: this admin tool is not built yet. It replaces the old
// vendor-template demo screen (made-up names and numbers).
export default function Page() {
  return (
    <AdminInfoPage
      title="Post a Photo"
      purpose="Post a photo as Pueblo Connect staff."
      status="Not built yet"
      today={[
        "Photos are posted from the box at the top of the newsfeed. The browser shrinks large photos before they upload.",
        "Business logos and covers, and event and group covers, are changed by their owners on their own pages.",
      ]}
      links={[
          { href: "/newsfeed", label: "Go to the newsfeed" },
      ]}
    />
  );
}
