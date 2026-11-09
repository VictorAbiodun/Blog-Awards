"use client";

import { useCallback, useState, type ChangeEvent, type FormEvent } from "react";

import { AdminPage } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/ui/field";
import { ErrorBlock, LoadingBlock, Notice } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { errorMessage } from "@/lib/error-message";
import { fieldErrors } from "@/lib/form";
import { artistFormSchema } from "@/lib/validation";
import { api } from "@/services";
import type { Artist } from "@/types/domain";

const MAX_IMAGE_BYTES = 150 * 1024;
const empty = { name: "", bio: "", musicUrl: "", socialUrl: "", categoryIds: [] as string[], status: "draft" as "draft" | "published", imageUrl: undefined as string | undefined };

export function AdminArtistsView() {
  const load = useCallback(async () => {
    const [artists, season] = await Promise.all([api.listAdminArtists(), api.getAdminSeason()]);
    return { artists, categories: season.categories };
  }, []);
  const { state, reload, refresh } = useAsync(load);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function edit(artist: Artist) {
    setEditingId(artist.id);
    setForm({ name: artist.name, bio: artist.bio, musicUrl: artist.musicUrl, socialUrl: artist.socialUrl, categoryIds: artist.categoryIds, status: artist.status, imageUrl: artist.imageUrl });
    setErrors({});
    setMessage(null);
  }

  function reset() {
    setEditingId(null);
    setForm(empty);
    setErrors({});
  }

  function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErrors({ image: "Choose an image file." });
    if (file.size > MAX_IMAGE_BYTES) return setErrors({ image: "Choose a smaller image (under 150 KB)." });
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, imageUrl: String(reader.result) }));
    reader.readAsDataURL(file);
    setErrors({});
  }

  async function save(status: "draft" | "published", event?: FormEvent) {
    event?.preventDefault();
    setMessage(null);
    const parsed = artistFormSchema.safeParse({ ...form, status });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      const saved = await api.saveArtist({ ...parsed.data, id: editingId ?? undefined, imageUrl: form.imageUrl });
      setMessage({ tone: "info", text: status === "published" ? `${saved.name} is published.` : `${saved.name} is saved as a draft.` });
      reset();
      refresh();
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPage title="Artists">
      {state.status === "loading" ? <LoadingBlock label="Loading artists" /> : null}
      {state.status === "error" ? <ErrorBlock error={state.error} onRetry={reload} /> : null}
      {state.status === "ready" ? (
        <div className="grid gap-8 md:grid-cols-[520px_536px] md:items-start md:gap-6">
          <section aria-labelledby="list-title" className="flex flex-col gap-5">
            <h2 id="list-title" className="text-[30px] font-bold leading-[1.1]">
              All artists
            </h2>
            <ul className="flex flex-col gap-4">
              {state.data.artists.map((artist) => (
                <li key={artist.id} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xl font-medium">{artist.name}</p>
                    <p className="text-base text-muted">{state.data.categories.find((c) => c.id === artist.categoryIds[0])?.name}</p>
                  </div>
                  <span className="w-[90px] text-lg font-semibold">{artist.status === "published" ? "Published" : "Draft"}</span>
                  <button type="button" onClick={() => edit(artist)} className="text-lg font-semibold underline underline-offset-4" aria-label={`Edit ${artist.name}`}>
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <form onSubmit={(event) => save(form.status, event)} noValidate className="flex flex-col gap-4 bg-elevated p-5 md:p-7">
            <h2 className="text-[30px] font-bold leading-[1.1] md:text-[32px]">{editingId ? "Edit artist" : "Add an artist"}</h2>
            <p className="text-lg leading-[1.35] text-muted">Artists do not log in. You add and edit all artist information here.</p>
            {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
            <Field tone="ground" label="Artist name" placeholder="Stage name as it should appear" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
            <TextAreaField tone="ground" label="Biography" placeholder="A short biography for the artist page" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} error={errors.bio} />
            <div className="flex flex-col gap-2">
              <label htmlFor="artist-image" className="text-[19px] font-medium">
                Profile image
              </label>
              <div className="flex flex-col items-center gap-2 bg-ground px-4 py-5 text-center">
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview of an uploaded file
                  <img src={form.imageUrl} alt="Preview of the chosen image" className="size-20 object-cover" />
                ) : null}
                <input id="artist-image" type="file" accept="image/*" onChange={pickImage} className="w-full text-base" />
                <p className="text-base text-muted">Use only images you own or have permission to use.</p>
              </div>
              {errors.image ? (
                <p role="alert" className="text-base font-semibold text-orange">
                  <span aria-hidden="true">! </span>
                  {errors.image}
                </p>
              ) : null}
            </div>
            <Field tone="ground" label="Music link" placeholder="https://" value={form.musicUrl} onChange={(e) => setForm({ ...form, musicUrl: e.target.value })} error={errors.musicUrl} />
            <Field tone="ground" label="Social link" placeholder="https://" value={form.socialUrl} onChange={(e) => setForm({ ...form, socialUrl: e.target.value })} error={errors.socialUrl} />

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[19px] font-medium">Categories</legend>
              <div className="flex flex-wrap gap-2">
                {state.data.categories.map((category) => {
                  const on = form.categoryIds.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setForm({ ...form, categoryIds: on ? form.categoryIds.filter((id) => id !== category.id) : [...form.categoryIds, category.id] })}
                      className={`px-3.5 py-2.5 text-[17px] ${on ? "bg-gold font-bold text-on-color" : "bg-ground font-medium text-ink"}`}
                    >
                      {on ? "Added: " : "+ "}
                      {category.name}
                    </button>
                  );
                })}
              </div>
              {errors.categoryIds ? (
                <p role="alert" className="text-base font-semibold text-orange">
                  <span aria-hidden="true">! </span>
                  {errors.categoryIds}
                </p>
              ) : null}
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[19px] font-medium">Status</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {(["draft", "published"] as const).map((status) => (
                  <button key={status} type="button" aria-pressed={form.status === status} onClick={() => setForm({ ...form, status })} className={`h-12 text-[17px] ${form.status === status ? "bg-mint font-bold text-on-color" : "bg-ground font-medium text-ink"}`}>
                    {form.status === status ? "Selected: " : ""}
                    {status === "draft" ? "Draft (hidden)" : "Published (public)"}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" size="lg" full disabled={busy} onClick={() => save("published")}>
                Save and publish
              </Button>
              <Button type="button" tone="ground" size="lg" full disabled={busy} onClick={() => save("draft")}>
                Save as draft
              </Button>
            </div>
            {editingId ? (
              <button type="button" onClick={reset} className="w-fit text-lg font-semibold underline underline-offset-4">
                Cancel editing and add a new artist
              </button>
            ) : null}
            <p className="text-base text-muted">Publishing is recorded in the audit log.</p>
          </form>
        </div>
      ) : null}
    </AdminPage>
  );
}
