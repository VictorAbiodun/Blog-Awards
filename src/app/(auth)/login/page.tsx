import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { AuthSplit } from "@/components/layout/auth-split";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthSplit tone="mint" headline={"WELCOME\nBACK."} sentence="Log in to see your wallet, your votes and the artists you back." title="Log in">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthSplit>
  );
}
