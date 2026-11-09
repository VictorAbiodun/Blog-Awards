import { NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const check = await requireServerAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const admin = createSupabaseAdminClient();
  const [{ data: season, error: seasonErr }, { data: categories }] =
    await Promise.all([
      admin.from("seasons").select("*").eq("is_current", true).single(),
      admin.from("categories").select("*").order("display_order"),
    ]);

  if (seasonErr || !season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  return NextResponse.json({
    season: {
      id: season.id,
      name: season.name,
      votingStatus: season.voting_status,
      votePriceKobo: season.vote_price_kobo,
      minTopUpKobo: season.min_top_up_kobo,
      maxTopUpKobo: season.max_top_up_kobo,
      rulesVersion: season.rules_version,
      votingOpensAt: season.voting_opens_at,
      votingClosesAt: season.voting_closes_at,
      showVoteCounts: season.show_vote_counts,
    },
    categories: (categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      eligibility: c.eligibility,
      status: c.status,
    })),
  });
}

export async function POST(request: Request) {
  const check = await requireServerAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const body = await request.json();
    const admin = createSupabaseAdminClient();

    const { data: currentSeason, error: currentErr } = await admin
      .from("seasons")
      .select("*")
      .eq("is_current", true)
      .single();

    if (currentErr || !currentSeason) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    if (body.type === "set_voting_status") {
      const nextStatus = body.status === "closed" ? "closed" : "open";
      const { data: updated, error: updateErr } = await admin
        .from("seasons")
        .update({ voting_status: nextStatus })
        .eq("id", currentSeason.id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      await admin.from("audit_logs").insert({
        user_id: check.user.id,
        action: "set_voting_status",
        entity_type: "season",
        entity_id: currentSeason.id,
        details: { status: nextStatus },
      });

      return NextResponse.json({
        id: updated.id,
        name: updated.name,
        votingStatus: updated.voting_status,
        votePriceKobo: updated.vote_price_kobo,
        minTopUpKobo: updated.min_top_up_kobo,
        maxTopUpKobo: updated.max_top_up_kobo,
        rulesVersion: updated.rules_version,
        votingOpensAt: updated.voting_opens_at,
        votingClosesAt: updated.voting_closes_at,
        showVoteCounts: updated.show_vote_counts,
      });
    }

    // Season settings update
    const priceChanged = currentSeason.vote_price_kobo !== body.votePriceKobo;
    const nextRulesVersion = priceChanged
      ? currentSeason.rules_version + 1
      : currentSeason.rules_version;

    const { data: updated, error: updateErr } = await admin
      .from("seasons")
      .update({
        vote_price_kobo: body.votePriceKobo,
        min_top_up_kobo: body.minTopUpKobo,
        max_top_up_kobo: body.maxTopUpKobo,
        voting_opens_at: body.votingOpensAt || null,
        voting_closes_at: body.votingClosesAt || null,
        rules_version: nextRulesVersion,
      })
      .eq("id", currentSeason.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      user_id: check.user.id,
      action: "update_season_settings",
      entity_type: "season",
      entity_id: currentSeason.id,
      details: body,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      votingStatus: updated.voting_status,
      votePriceKobo: updated.vote_price_kobo,
      minTopUpKobo: updated.min_top_up_kobo,
      maxTopUpKobo: updated.max_top_up_kobo,
      rulesVersion: updated.rules_version,
      votingOpensAt: updated.voting_opens_at,
      votingClosesAt: updated.voting_closes_at,
      showVoteCounts: updated.show_vote_counts,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
