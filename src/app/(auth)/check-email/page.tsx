import type { Metadata } from "next";
import { Suspense } from "react";

import { CheckEmail } from "@/components/auth/check-email";
import { AuthSplit } from "@/components/layout/auth-split";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <AuthSplit
      tone="mint"
      headline={"CHECK YOUR\nINBOX."}
      sentence="We sent a link to confirm your email. It must be confirmed before you can fund a wallet or vote."
      title="Confirm your email"
    >
      <Suspense fallback={null}>
        <CheckEmail />
      </Suspense>
    </AuthSplit>
  );
}
