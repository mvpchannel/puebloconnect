import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Payment Error",
};

export default function MembershipErrorPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const rawReason = searchParams.reason;
  const reason = typeof rawReason === "string" ? rawReason : null;

  return (
    <>
      <link rel="stylesheet" href="/css/membership.css" />
      <Header />
      <div className="checkout-result error">
        <div className="result-icon">!</div>
        <h1>Something went wrong</h1>
        <p>
          Your payment couldn&rsquo;t be completed{reason ? ` (${reason})` : ""}. You
          have not been charged. Please try again, or contact us if this keeps
          happening.
        </p>
        <Link href="/membership" className="mtr-btn signin">
          <span>Try again</span>
        </Link>
      </div>
      <Footer />
    </>
  );
}
