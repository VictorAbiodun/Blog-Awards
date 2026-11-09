"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { AdminPage } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, TextAreaField } from "@/components/ui/field";
import { ErrorBlock, LoadingBlock, Notice } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { errorMessage } from "@/lib/error-message";
import { fieldErrors } from "@/lib/form";
import { formatNaira, nairaTextToKobo } from "@/lib/format";
import { categoryFormSchema } from "@/lib/validation";
import { api } from "@/services";
import type { Season } from "@/types/domain";

const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const fromLocalInput = (text: string) => (text ? new Date(text).toISOString() : null);
const toNairaText = (kobo: number) => String(kobo / 100);

type Message = { tone: "info" | "error"; text: string } | null;

function SettingsForm({ season, onSaved }: { season: Season; onSaved: () => void }) {
  const [price, setPrice] = useState(toNairaText(season.votePriceKobo));
  const [min, setMin] = useState(toNairaText(season.minTopUpKobo));
  const [max, setMax] = useState(toNairaText(season.maxTopUpKobo));
  const [opens, setOpens] = useState(toLocalInput(season.votingOpensAt));
  const [closes, setCloses] = useState(toLocalInput(season.votingClosesAt));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<Message>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const next: Record<string, string> = {};
    const priceKobo = nairaTextToKobo(price);
    const minKobo = nairaTextToKobo(min);
    const maxKobo = nairaTextToKobo(max);
    if (!priceKobo) next.price = "Enter the price per vote in naira, like 50.";
    if (!minKobo) next.min = "Enter the minimum top-up in naira.";
    if (!maxKobo) next.max = "Enter the maximum top-up in naira.";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await api.saveSeasonSettings({ votePriceKobo: priceKobo!, minTopUpKobo: minKobo!, maxTopUpKobo: maxKobo!, votingOpensAt: fromLocalInput(opens), votingClosesAt: fromLocalInput(closes) });
      setMessage({ tone: "info", text: "Saved. The change is recorded in the audit log." });
      onSaved();
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error) });
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4 bg-elevated p-5 md:p-7">
      <h2 className="text-[30px] font-bold leading-[1.1]">Voting price and limits</h2>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Field tone="ground" label="Price per vote (naira)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} error={errors.price} hint={`Now ${formatNaira(season.votePriceKobo)}. Stored as ${season.votePriceKobo} kobo.`} />
      <Field tone="ground" label="Minimum top-up (naira)" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} error={errors.min} />
      <Field tone="ground" label="Maximum top-up (naira)" inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} error={errors.max} />
      <Field tone="ground" label="Voting opens" type="datetime-local" value={opens} onChange={(e) => setOpens(e.target.value)} />
      <Field tone="ground" label="Voting closes" type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} hint="Voting only works between these two dates, while voting is open." />
      <p className="text-base text-muted">Rules version {season.rulesVersion}. Changing the price creates a new version.</p>
      <Button type="submit" size="lg" full>
        Save changes
      </Button>
      <p className="text-base text-muted">Changes are recorded in the audit log.</p>
    </form>
  );
}

export function AdminSeasonView() {
  const load = useCallback(() => api.getAdminSeason(), []);
  const { state, reload, refresh } = useAsync(load);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [category, setCategory] = useState({ name: "", description: "", eligibility: "" });
  const [catErrors, setCatErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  async function toggleVoting(next: "open" | "closed") {
    try {
      await api.setVotingStatus(next);
      setConfirmToggle(false);
      refresh();
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error) });
      setConfirmToggle(false);
    }
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    const parsed = categoryFormSchema.safeParse(category);
    if (!parsed.success) return setCatErrors(fieldErrors(parsed.error));
    setCatErrors({});
    try {
      await api.addCategory(parsed.data);
      setCategory({ name: "", description: "", eligibility: "" });
      setMessage({ tone: "info", text: `Category ${parsed.data.name} added.` });
      refresh();
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error) });
    }
  }

  return (
    <AdminPage title="Season & rules">
      {state.status === "loading" ? <LoadingBlock label="Loading season" /> : null}
      {state.status === "error" ? <ErrorBlock error={state.error} onRetry={reload} /> : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      {state.status === "ready" ? (
        <>
          {(() => {
            const open = state.data.season.votingStatus === "open";
            return (
              <>
                <div className={`flex flex-col justify-between gap-5 p-5 text-on-color md:flex-row md:items-center md:p-7 ${open ? "bg-mint" : "bg-grey"}`}>
                  <div>
                    <p className="text-xl font-medium">{state.data.season.name}</p>
                    <p className="font-display text-[64px] uppercase leading-[0.9] md:text-[96px]">{open ? "Voting is open" : "Voting is closed"}</p>
                    <p className="text-lg">{open ? "Voting closes on the date set below. You can also close it early." : "Fans cannot vote. You can publish winners now."}</p>
                  </div>
                  <Button tone="black" size="lg" className="md:w-[220px]" onClick={() => setConfirmToggle(true)}>
                    {open ? "Close voting" : "Open voting"}
                  </Button>
                </div>
                <Dialog open={confirmToggle} onClose={() => setConfirmToggle(false)} title={open ? "Close voting?" : "Open voting?"}>
                  <p className="text-lg leading-[1.45]">{open ? "Fans will no longer be able to vote. You can open it again later." : "Fans will be able to vote right away."} This is recorded in the audit log.</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button size="lg" full onClick={() => toggleVoting(open ? "closed" : "open")}>
                      {open ? "Yes, close voting" : "Yes, open voting"}
                    </Button>
                    <Button tone="ground" size="lg" full onClick={() => setConfirmToggle(false)}>
                      Cancel
                    </Button>
                  </div>
                </Dialog>
              </>
            );
          })()}

          <div className="grid gap-6 md:grid-cols-[520px_536px] md:items-start">
            <SettingsForm key={state.data.season.rulesVersion + state.data.season.votePriceKobo} season={state.data.season} onSaved={refresh} />
            <div className="flex flex-col gap-6">
              <section aria-labelledby="cats-title" className="flex flex-col gap-4">
                <h2 id="cats-title" className="text-[30px] font-bold leading-[1.1]">
                  Categories
                </h2>
                <ul className="flex flex-col gap-3.5">
                  {state.data.categories.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-4">
                      <span className="text-xl font-medium">{c.name}</span>
                      <span className="text-lg font-semibold">{c.status === "open" ? "Open" : "Closed"}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.setCategoryStatus(c.id, c.status === "open" ? "closed" : "open");
                          refresh();
                        }}
                        className="w-[70px] text-right text-lg font-semibold underline underline-offset-4"
                        aria-label={`${c.status === "open" ? "Close" : "Open"} ${c.name}`}
                      >
                        {c.status === "open" ? "Close" : "Open"}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              <form onSubmit={addCategory} noValidate className="flex flex-col gap-4 bg-elevated p-5 md:p-7">
                <h2 className="text-[30px] font-bold leading-[1.1]">Add a category</h2>
                <Field tone="ground" label="Category name" placeholder="For example, Best Newcomer" value={category.name} onChange={(e) => setCategory({ ...category, name: e.target.value })} error={catErrors.name} />
                <TextAreaField tone="ground" label="Description" placeholder="What this award recognises" value={category.description} onChange={(e) => setCategory({ ...category, description: e.target.value })} error={catErrors.description} />
                <Field tone="ground" label="Voting eligibility" placeholder="Who or what can be voted for" value={category.eligibility} onChange={(e) => setCategory({ ...category, eligibility: e.target.value })} error={catErrors.eligibility} />
                <Button type="submit" size="lg" full>
                  Add category
                </Button>
              </form>
            </div>
          </div>
        </>
      ) : null}
    </AdminPage>
  );
}
