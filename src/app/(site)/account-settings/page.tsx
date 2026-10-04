import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import EditProfileForm from "@/components/EditProfileForm";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import NotificationPreferencesForm from "@/components/NotificationPreferencesForm";
import { getCurrentUser } from "@/lib/require-user";
import { getUserById } from "@/lib/db";

export const metadata: Metadata = {
  title: "Account Settings",
};

// Real settings page — replaces the two dead "edit profile" / "account
// setting" links in Header.tsx (both point here now; #profile / #password
// jump straight to a section). Backed by:
//   - POST /api/account/profile (name, city, avatar)
//   - POST /api/account/password (change password)
//   - POST /api/account/notification-preferences (marketing email opt-in —
//     this route already existed, just had no page wired to it yet)
// Member-only — gated in src/middleware.ts.
export default async function AccountSettingsPage() {
  const session = await getCurrentUser();
  const user = session ? getUserById(session.sub) : null;

  return (
    <>
      <Header />

      <section>
        <div className="gap2 color-bg">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="top-banner">
                  <h1>Account Settings</h1>
                </div>
                <nav className="breadcrumb">
                  <Link className="breadcrumb-item" href="/">Home</Link>
                  <span className="breadcrumb-item active">Account Settings</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="gap gray-bg">
          <div className="container">
            <div className="row" id="page-contents">
              <div className="col-lg-3">
                <Sidebar />
              </div>
              <div className="col-lg-9">
                {!user ? (
                  <div className="central-meta">
                    <div className="editing-interest">
                      <p style={{ color: "#888" }}>
                        <Link href="/login" title="">Log in</Link> to manage your account settings.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="central-meta" id="profile" style={{ marginBottom: 20 }}>
                      <div className="editing-interest">
                        <h5 className="f-title"><i className="ti-pencil-alt" /> Edit Profile</h5>
                        <EditProfileForm
                          firstName={user.first_name ?? ""}
                          lastName={user.last_name ?? ""}
                          city={user.city ?? ""}
                          profilePhotoPath={user.profile_photo_path}
                          bio={user.bio ?? ""}
                          coverPhotoPath={user.cover_photo_path}
                        />
                      </div>
                    </div>

                    <div className="central-meta" id="password" style={{ marginBottom: 20 }}>
                      <div className="editing-interest">
                        <h5 className="f-title"><i className="ti-lock" /> Change Password</h5>
                        <ChangePasswordForm />
                      </div>
                    </div>

                    <div className="central-meta" id="notifications">
                      <div className="editing-interest">
                        <h5 className="f-title"><i className="ti-bell" /> Email Preferences</h5>
                        <NotificationPreferencesForm
                          initialOptIn={Boolean(user.marketing_emails_opt_in)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
