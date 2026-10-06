import type { Metadata } from "next";
import AdminInfoPage from "@/components/admin/AdminInfoPage";

export const metadata: Metadata = {
  title: "Reviews",
};

// An honest placeholder: this admin tool is not built yet. It replaces the old
// vendor-template demo screen (made-up names and numbers).
export default function Page() {
  return (
    <AdminInfoPage
      title="Reviews"
      purpose="Read and moderate the reviews members leave for local businesses."
      status="Not built yet"
      today={[
        "Members leave and read reviews on each business's own page.",
        "There is no staff review dashboard or filter yet.",
      ]}
      links={[
          { href: "/businesses", label: "Business channels" },
      ]}
    />
  );
}
