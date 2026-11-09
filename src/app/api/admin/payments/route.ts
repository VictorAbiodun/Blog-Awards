import { NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const check = await requireServerAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const admin = createSupabaseAdminClient();
  const { data: payments, error } = await admin
    .from("payments")
    .select("*, profiles:user_id(display_name)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = (payments ?? []).map((p) => ({
    id: p.id,
    reference: p.reference,
    userId: p.user_id,
    fanLabel: p.profiles?.display_name ?? `Fan (${p.user_id.slice(0, 6)})`,
    amountKobo: p.amount_kobo,
    status: p.status,
    createdAt: p.created_at,
  }));

  return NextResponse.json(formatted);
}

