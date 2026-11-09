import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";
import { AuthSplit } from "@/components/layout/auth-split";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <AuthSplit
      tone="gold"
      headline={"JOIN THE\nVOTE."}
      sentence="One free account lets you fund a wallet and vote. We only ask for what voting needs: a name, an email and a password."
      title="Create your account"
    >
      <RegisterForm />
    </AuthSplit>
  );
}
