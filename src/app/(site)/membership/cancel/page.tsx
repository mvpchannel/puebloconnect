import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Payment Cancelled",
};

export default function MembershipCancelPage() {
  return (
    <>
      <link rel="stylesheet" href="/css/membership.css" />
      <Header />
      <div className="checkout-result cancel">
        <div className="result-icon">–</div>
        <h1>Checkout cancelled</h1>
        <p>No payment was made, and nothing was charged. You can pick a plan whenever you're ready.</p>
        <Link href="/membership" className="mtr-btn signin">
          <span>Back to plans</span>
        </Link>
      </div>
      <Footer />
    </>
  );
}
