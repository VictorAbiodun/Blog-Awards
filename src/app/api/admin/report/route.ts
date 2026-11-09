import { NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  // Neutralise CSV injection characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const check = await requireServerAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const admin = createSupabaseAdminClient();

  if (kind === "winners") {
    const { data: winners } = await admin
      .from("winners")
      .select("*, categories(name), artists(name, slug, votes)")
      .not("published_at", "is", null);

    const rows = [
      ["Category", "Winner", "Slug", "Votes", "Published At"],
      ...(winners ?? []).map((w) => [
        w.categories?.name ?? "",
        w.artists?.name ?? "",
        w.artists?.slug ?? "",
        w.artists?.votes ?? 0,
        w.published_at ?? "",
      ]),
    ];

    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
  }

  if (kind === "payments") {
    const { data: payments } = await admin
      .from("payments")
      .select("*, profiles:user_id(display_name)")
      .order("created_at", { ascending: false });

    const rows = [
      ["Reference", "Fan", "User ID", "Amount (Kobo)", "Status", "Date"],
      ...(payments ?? []).map((p) => [
        p.reference,
        p.profiles?.display_name ?? "Fan",
        p.user_id,
        p.amount_kobo,
        p.status,
        p.created_at,
      ]),
    ];

    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
  }

  if (kind === "votes") {
    const { data: votes } = await admin
      .from("votes")
      .select("*, artists(name), categories(name)")
      .order("created_at", { ascending: false });

    const rows = [
      ["Receipt No", "Artist", "Category", "Votes", "Total (Kobo)", "Status", "Date"],
      ...(votes ?? []).map((v) => [
        v.receipt_no,
        v.artists?.name ?? "",
        v.categories?.name ?? "",
        v.votes,
        v.total_kobo,
        v.status,
        v.created_at,
      ]),
    ];

    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
  }

  if (kind === "audit") {
    const { data: logs } = await admin
      .from("audit_logs")
      .select("*, profiles:user_id(display_name)")
      .order("created_at", { ascending: false });

    const rows = [
      ["Action", "Admin", "Entity Type", "Entity ID", "Reason", "Date"],
      ...(logs ?? []).map((l) => [
        l.action,
        l.profiles?.display_name ?? "Admin",
        l.entity_type,
        l.entity_id,
        l.reason ?? "",
        l.created_at,
      ]),
    ];

    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
  }

  return NextResponse.json({ error: "Invalid report kind" }, { status: 400 });
}

