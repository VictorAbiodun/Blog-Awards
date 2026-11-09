import type { Metadata } from "next";

import { ForgotForm } from "@/components/auth/forgot-form";
import { AuthSplit } from "@/components/layout/auth-split";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthSplit
      tone="orange"
      headline={"FORGOT IT?\nNO STRESS."}
      sentence="Enter the email you signed up with and we will send you a link to choose a new password."
      title="Reset your password"
    >
      <ForgotForm />
    </AuthSplit>
  );
}
