import { NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const check = await requireServerAdmin();
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const admin = createSupabaseAdminClient();
    const { data: winners, error } = await admin
      .from("winners")
      .select("*, categories(name), artists(name, slug, votes)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (winners ?? []).map((w) => ({
      categoryId: w.category_id,
      categoryName: w.categories?.name ?? "Category",
      artistId: w.artist_id,
      artistSlug: w.artists?.slug ?? "nominee",
      artistName: w.artists?.name ?? "Nominee",
      votes: w.artists?.votes ?? 0,
      publishedAt: w.published_at,
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const check = await requireServerAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const { categoryId } = await request.json();
    const admin = createSupabaseAdminClient();

    // 1. Season must be closed to publish winners
    const { data: season } = await admin
      .from("seasons")
      .select("*")
      .eq("is_current", true)
      .single();

    if (!season || season.voting_status !== "closed") {
      return NextResponse.json(
        { error: "Winners can only be published once voting is closed." },
        { status: 400 },
      );
    }

    // 2. Category details
    const { data: category } = await admin
      .from("categories")
      .select("name")
      .eq("id", categoryId)
      .single();

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // 3. Find top voted artist in that category
    const { data: topArtist } = await admin
      .from("artists")
      .select("id, name, slug, votes, artist_categories!inner(category_id)")
      .eq("artist_categories.category_id", categoryId)
      .eq("status", "published")
      .order("votes", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!topArtist) {
      return NextResponse.json(
        { error: "No published nominees found in this category." },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { data: winner, error: upsertErr } = await admin
      .from("winners")
      .upsert(
        {
          season_id: season.id,
          category_id: categoryId,
          artist_id: topArtist.id,
          published_at: now,
        },
        { onConflict: "season_id, category_id" },
      )
      .select()
      .single();

    if (upsertErr || !winner) {
      return NextResponse.json({ error: upsertErr?.message ?? "Publish failed" }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      user_id: check.user.id,
      action: "publish_winner",
      entity_type: "winner",
      entity_id: winner.id,
      details: { categoryId, artistId: topArtist.id, artistName: topArtist.name },
    });

    return NextResponse.json({
      categoryId,
      categoryName: category.name,
      artistId: topArtist.id,
      artistSlug: topArtist.slug,
      artistName: topArtist.name,
      votes: topArtist.votes,
      publishedAt: now,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

