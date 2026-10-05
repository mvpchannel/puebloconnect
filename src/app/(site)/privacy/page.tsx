import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Pueblo Connect collects, why, who can see it, and who else handles it.",
};

// Public. Written from what the code actually does (see the audit notes in the
// commit that added this page); if a feature changes what is collected or
// shared, update this page in the same change. The wording has not been
// reviewed by a lawyer, which is for the site owner to arrange.
const h: React.CSSProperties = { marginTop: 26, marginBottom: 8 };

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <section>
        <div className="gap2 top-margin">
          <div className="container" style={{ maxWidth: 800 }}>
            <h2 style={{ marginBottom: 4 }}>Privacy Policy</h2>
            <p style={{ color: "#888" }}>Last updated October 4, 2026</p>
            <p>
              This explains what Pueblo Connect collects when you use the site, why, who can see it, and which outside
              services handle some of it. It works alongside our <Link href="/terms">Terms of Use</Link>.
            </p>

            <h4 style={h}>What we collect</h4>
            <p><strong>Your account.</strong> Username, email address and password. Your password is stored in scrambled (hashed) form; we can&rsquo;t read it. You can also add your first and last name, city and a profile photo and cover photo.</p>
            <p><strong>What you post and do.</strong> Posts, photos, videos, comments, likes, 24-hour stories, group and event activity (including RSVPs and check-ins), reviews, deal claims, Pueblo Points, Passport stamps, treasures you find, Pueblo Booth answers, Best of the Pueblo votes, and your messages to other members.</p>
            <p><strong>Your location, only if you share it.</strong> If you use Nearby, you can set your location from your browser&rsquo;s location feature or by letting us estimate it from your IP address. We store the coordinates (and a city and region when estimated). You can clear it.</p>
            <p><strong>Business details.</strong> If you add a business: its name, category, description, address, phone, website, hours, photos, deals and events.</p>
            <p><strong>Messages and reports you send us.</strong> Contact-form messages (name, email, phone and company if given), advertising or sponsorship inquiries, and reports you file about content or members.</p>
            <p><strong>Payments.</strong> If you buy a business membership, Stripe collects your card details; we never see or store your card number. We keep the plan, amount, status and Stripe reference numbers for the purchase.</p>
            <p><strong>Technical records.</strong> We keep short-lived records of attempts such as logins and form submissions, tied to your IP address, to block abuse. Your browser also keeps one sign-in cookie (see below).</p>

            <h4 style={h}>Why we use it</h4>
            <p>To run your account, show your posts and profile to others, deliver messages and notifications, show nearby members and local businesses, run deals, events, rewards and live broadcasts, process memberships, keep the site safe (including reviewing reports), and answer you when you contact us. We send account emails (such as email verification and password resets). Marketing emails are sent only if you opted in, and you can change that in your account settings.</p>

            <h4 style={h}>Who can see it</h4>
            <ul>
              <li><strong>Public pages</strong> (businesses, events, deals, classifieds, Business Spotlight stories, Pueblo Live and answers on We Asked the Pueblo) can be seen by anyone, including visitors who aren&rsquo;t logged in. Answers show your first name, last initial and city if you&rsquo;ve set one.</li>
              <li><strong>Members-only areas</strong> (such as the newsfeed, profiles and the 3D Pueblo) are visible to logged-in members.</li>
              <li><strong>Nearby</strong> shows other members your name, photo, city and region (if set) and approximate distance. It does not show your coordinates.</li>
              <li><strong>Direct messages</strong> are visible to you and the people in the conversation. Pueblo Connect administrators can access stored data in order to operate the site and handle reports.</li>
            </ul>
            <p>We don&rsquo;t sell your personal information.</p>

            <h4 style={h}>Outside services that handle some of it</h4>
            <ul>
              <li><strong>Stripe</strong> processes membership payments.</li>
              <li><strong>Resend</strong> delivers our emails, so it receives your email address and the message.</li>
              <li><strong>IP2Location.io</strong> receives your IP address if you ask us to estimate your location from it.</li>
              <li><strong>YouTube, Vimeo, Facebook and Matterport</strong> provide the players for Pueblo Live broadcasts and virtual tours. When you watch one, that provider may collect information about you under its own policy.</li>
            </ul>

            <h4 style={h}>Cookies</h4>
            <p>We use one sign-in cookie that keeps you logged in. We don&rsquo;t use advertising or analytics cookies on Pueblo Connect itself. The video players above may set their own.</p>

            <h4 style={h}>How long we keep it</h4>
            <p>We keep your account information while your account exists. Stories disappear after 24 hours, and abuse-prevention records are deleted after a short time. Content you delete is removed from view; some backups and records, such as payment records, may be kept longer where we need them.</p>

            <h4 style={h}>Your choices</h4>
            <p>You can edit your profile, photos, notification and email preferences, and location in your account. To ask us to correct or delete your information, or with any privacy question, <Link href="/contact">contact us</Link>.</p>

            <h4 style={h}>Changes</h4>
            <p>If we change what we collect or how we use it, we&rsquo;ll update this page and its date.</p>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
