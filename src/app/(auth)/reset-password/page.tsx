import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetForm } from "@/components/auth/reset-form";
import { AuthSplit } from "@/components/layout/auth-split";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthSplit tone="orange" headline={"NEW\nPASSWORD."} sentence="Choose a new password for your account. Use at least 8 characters." title="Choose a new password">
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </AuthSplit>
  );
}
