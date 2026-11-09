import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
    }

    const nairaPerPoint = Number(process.env.CONVERSION_RATE_NAIRA_PER_POINT || 50);

    return NextResponse.json({
      bankName: process.env.OPAY_BANK_NAME || "OPay",
      accountName: process.env.OPAY_ACCOUNT_NAME || "Victor Awards OPay",
      accountNumber: process.env.OPAY_ACCOUNT_NUMBER || "9012345678",
      nairaPerPoint: Number.isFinite(nairaPerPoint) && nairaPerPoint > 0 ? nairaPerPoint : 50,
      minAmountNaira: nairaPerPoint > 0 ? nairaPerPoint : 50,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
