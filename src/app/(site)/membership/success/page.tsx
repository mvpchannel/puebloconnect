import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Payment Successful",
};

export default function MembershipSuccessPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const rawPlan = searchParams.plan;
  const planStr = typeof rawPlan === "string" ? rawPlan : undefined;
  const plan = planStr ? planStr[0].toUpperCase() + planStr.slice(1) : null;

  return (
    <>
      <link rel="stylesheet" href="/css/membership.css" />
      <Header />
      <div className="checkout-result success">
        <div className="result-icon">✓</div>
        <h1>Payment successful</h1>
        <p>
          {plan ? (
            <>
              Your <strong>{plan}</strong> membership is now active. Thanks for
              supporting Pueblo Connect.
            </>
          ) : (
            "Your membership is now active. Thanks for supporting Pueblo Connect."
          )}
        </p>
        <Link href="/membership" className="mtr-btn signin">
          <span>View membership</span>
        </Link>
      </div>
      <Footer />
    </>
  );
}
