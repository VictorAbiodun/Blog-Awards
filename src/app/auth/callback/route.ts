import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const errorParam = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Determine destination URL
  let next = requestUrl.searchParams.get("next") ?? "/email-confirmed";
  // Protect against open redirects: must be relative path
  if (!next.startsWith("/") || next.startsWith("//")) {
    next = "/email-confirmed";
  }

  // If Supabase returned an explicit error (e.g. link expired)
  if (errorParam) {
    const message = encodeURIComponent(errorDescription || "Your confirmation link is invalid or has expired.");
    return NextResponse.redirect(new URL(`/login?error=${message}`, requestUrl.origin));
  }

  // 1. Handle PKCE code exchange
  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }
      // If code exchange failed (e.g. already exchanged on mobile prefetch)
      console.warn("Auth callback code exchange notice:", error.message);
    } catch (err) {
      console.error("Auth callback error during code exchange:", err);
    }
  }

  // 2. Handle token_hash verification
  if (token_hash && type) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (!error) {
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }
      console.warn("Auth callback verifyOtp notice:", error.message);
    } catch (err) {
      console.error("Auth callback error during verifyOtp:", err);
    }
  }

  // 3. Fallback: If verification couldn't be completed on server, redirect to
  // email-confirmed page with search params so the client-side Supabase SDK can
  // parse tokens from hash/params or prompt the user.
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
