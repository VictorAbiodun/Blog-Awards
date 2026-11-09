import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json({ error: "email_not_confirmed" }, { status: 403 });
    }

    const { amountKobo } = await request.json();
    if (!amountKobo || typeof amountKobo !== "number" || amountKobo <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // 1. Check season limits
    const { data: season } = await admin
      .from("seasons")
      .select("min_top_up_kobo, max_top_up_kobo")
      .eq("is_current", true)
      .single();

    if (season) {
      if (amountKobo < season.min_top_up_kobo || amountKobo > season.max_top_up_kobo) {
        return NextResponse.json({ error: "amount_out_of_range" }, { status: 400 });
      }
    }

    // 2. Find wallet
    const { data: wallet } = await admin
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const reference = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 3. Create pending payment record
    const { error: insertErr } = await admin.from("payments").insert({
      reference,
      user_id: user.id,
      wallet_id: wallet.id,
      amount_kobo: amountKobo,
      currency: "NGN",
      status: "pending",
      provider: process.env.PAYMENT_PROVIDER === "paystack" ? "paystack" : "mock",
    });

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // 4. Initialise with Paystack if configured
    if (process.env.PAYMENT_PROVIDER === "paystack" && process.env.PAYSTACK_SECRET_KEY) {
      const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: amountKobo, // Paystack expects integer kobo for NGN
          reference,
          callback_url: `${origin}/wallet?reference=${reference}`,
        }),
      });

      const paystackData = await paystackRes.json();
      if (!paystackRes.ok || !paystackData.status) {
        return NextResponse.json(
          { error: paystackData.message || "Failed to initialize Paystack checkout" },
          { status: 502 },
        );
      }

      return NextResponse.json({
        kind: "redirect",
        reference,
        url: paystackData.data.authorization_url,
      });
    }

    // Fallback: mock / demo response
    return NextResponse.json({
      kind: "demo",
      reference,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

