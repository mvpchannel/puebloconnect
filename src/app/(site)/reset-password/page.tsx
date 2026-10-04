import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password — Pueblo Connect",
};

export default function ResetPasswordPage() {
  // ResetPasswordForm reads ?token= via useSearchParams() — must be
  // wrapped in Suspense or `next build` fails (same reason as LoginForm).
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
