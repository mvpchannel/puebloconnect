import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SuccessClient from "./SuccessClient";

export const metadata: Metadata = {
  title: "Payment Successful",
};

export default function MembershipSuccessPage() {
  // SuccessClient uses useSearchParams() (to read ?session_id= that Stripe
  // appends on redirect) — Next.js requires that to be wrapped in Suspense
  // or `next build` fails.
  return (
    <>
      <link rel="stylesheet" href="/css/membership.css" />
      <Header />
      <Suspense
        fallback={
          <div className="checkout-result success">
            <h1>Confirming your payment…</h1>
          </div>
        }
      >
        <SuccessClient />
      </Suspense>
      <Footer />
    </>
  );
}
