import type { Metadata } from "next";
import AdminInfoPage from "@/components/admin/AdminInfoPage";

export const metadata: Metadata = {
  title: "Calendar",
};

// An honest placeholder: this admin tool is not built yet. It replaces the old
// vendor-template demo screen (made-up names and numbers).
export default function Page() {
  return (
    <AdminInfoPage
      title="Calendar"
      purpose="See every community event on a calendar and manage them from the admin panel."
      status="Not built yet"
      today={[
        "Events are created and browsed on the Events page, and today's events show on Happening Tonight.",
        "There is no staff calendar view yet.",
      ]}
      links={[
          { href: "/events", label: "Events" },
          { href: "/tonight", label: "Happening Tonight" },
      ]}
    />
  );
}
