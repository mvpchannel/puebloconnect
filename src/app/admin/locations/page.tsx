import type { Metadata } from "next";
import AdminInfoPage from "@/components/admin/AdminInfoPage";

export const metadata: Metadata = {
  title: "Locations",
};

// An honest placeholder: this admin tool is not built yet. It replaces the old
// vendor-template demo screen (made-up names and numbers).
export default function Page() {
  return (
    <AdminInfoPage
      title="Locations"
      purpose="Place and manage business locations on a map."
      status="Not built yet"
      today={[
        "Businesses are listed in the Business Channels directory, with their own pages.",
        "Businesses can get a building in the 3D city, and staff can hide treasure drops in it, from the 3D storefronts and treasure drops pages.",
      ]}
      links={[
          { href: "/businesses", label: "Business channels" },
          { href: "/admin/storefronts", label: "3D storefronts" },
          { href: "/admin/drops", label: "Treasure drops" },
      ]}
    />
  );
}
