import { NextResponse } from "next/server";

import { requireServerAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET() {
  try {
    const check = await requireServerAdmin();
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const admin = createSupabaseAdminClient();
    const { data: artists, error } = await admin
      .from("artists")
      .select("*, artist_categories(category_id)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (artists ?? []).map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      bio: a.bio,
      categoryIds: (a.artist_categories ?? []).map((ac: { category_id: string }) => ac.category_id),
      musicUrl: a.music_url ?? "",
      socialUrl: a.social_url ?? "",
      imageUrl: a.image_path ?? undefined,
      status: a.status,
      votes: a.votes ?? 0,
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
    const input = await request.json();
    const admin = createSupabaseAdminClient();

    const artistData = {
      name: input.name,
      bio: input.bio,
      music_url: input.musicUrl || null,
      social_url: input.socialUrl || null,
      image_path: input.imageUrl || null,
      status: input.status,
    };

    let artistId = input.id;
    let slug = "";

    if (artistId) {
      // Update
      const { data: existing, error: fetchErr } = await admin
        .from("artists")
        .select("slug")
        .eq("id", artistId)
        .single();

      if (fetchErr || !existing) {
        return NextResponse.json({ error: "Artist not found" }, { status: 404 });
      }
      slug = existing.slug;

      const { error: updateErr } = await admin
        .from("artists")
        .update(artistData)
        .eq("id", artistId);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    } else {
      // Create new with unique slug
      let baseSlug = toSlug(input.name);
      if (!baseSlug) baseSlug = "nominee";
      slug = baseSlug;
      let suffix = 1;

      while (true) {
        const { data: collision } = await admin
          .from("artists")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (!collision) break;
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
      }

      const { data: inserted, error: insertErr } = await admin
        .from("artists")
        .insert({ ...artistData, slug, votes: 0 })
        .select("id")
        .single();

      if (insertErr || !inserted) {
        return NextResponse.json({ error: insertErr?.message ?? "Insert failed" }, { status: 500 });
      }
      artistId = inserted.id;
    }

    // Update category associations
    if (Array.isArray(input.categoryIds)) {
      await admin.from("artist_categories").delete().eq("artist_id", artistId);
      if (input.categoryIds.length > 0) {
        const rows = input.categoryIds.map((catId: string) => ({
          artist_id: artistId,
          category_id: catId,
        }));
        await admin.from("artist_categories").insert(rows);
      }
    }

    // Append to audit log
    await admin.from("audit_logs").insert({
      user_id: check.user.id,
      action: input.id ? "update_artist" : "create_artist",
      entity_type: "artist",
      entity_id: artistId,
      details: { name: input.name, status: input.status, slug },
    });

    return NextResponse.json({
      id: artistId,
      slug,
      name: input.name,
      bio: input.bio,
      categoryIds: input.categoryIds ?? [],
      musicUrl: input.musicUrl ?? "",
      socialUrl: input.socialUrl ?? "",
      imageUrl: input.imageUrl,
      status: input.status,
      votes: 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

