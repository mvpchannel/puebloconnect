import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Join Pueblo Connect",
};

export default function LoginPage() {
  // LoginForm uses useSearchParams() (to read ?from= set by middleware.ts
  // when it redirects an unauthenticated visit) — Next.js requires that to
  // be wrapped in Suspense or `next build` fails.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
