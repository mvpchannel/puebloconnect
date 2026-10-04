import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Join Pueblo Connect",
};

export default function LoginPage() {
  return <LoginForm />;
}
