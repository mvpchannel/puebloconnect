import type { Metadata } from "next";
import AdminInfoPage from "@/components/admin/AdminInfoPage";

export const metadata: Metadata = {
  title: "Crop Image",
};

// An honest placeholder: this admin tool is not built yet. It replaces the old
// vendor-template demo screen (made-up names and numbers).
export default function Page() {
  return (
    <AdminInfoPage
      title="Crop Image"
      purpose="Crop a photo by hand before it is used."
      status="Not built yet"
      today={[
        "Photos are resized automatically in the browser when they are uploaded. There is no manual crop tool yet.",
        "Placeholder images are used wherever a business, event or group has no picture.",
      ]}
      links={[
          { href: "/businesses", label: "Business channels" },
      ]}
    />
  );
}
