import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyEmailStatus from "./VerifyEmailStatus";

export const metadata: Metadata = {
  title: "Verify Your Email — Pueblo Connect",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailStatus />
    </Suspense>
  );
}
