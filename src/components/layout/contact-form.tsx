"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, SelectField, TextAreaField } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { useUser } from "@/hooks/session";
import { errorMessage } from "@/lib/error-message";
import { fieldErrors } from "@/lib/form";
import { contactSchema } from "@/lib/validation";
import { api } from "@/services";

const subjects = [
  { value: "general", label: "A general question" },
  { value: "suggest-artist", label: "Suggest an artist" },
  { value: "account", label: "Help with my account" },
  { value: "payment", label: "Help with a payment" },
] as const;

export function ContactForm() {
  const user = useUser();
  const wanted = useSearchParams().get("subject");
  const initial = subjects.find((s) => s.value === wanted)?.value ?? "general";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<string>(initial);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setProblem(null);
    const parsed = contactSchema.safeParse({ name: name || user?.displayName || "", email: email || user?.email || "", subject, message });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      await api.sendContactMessage(parsed.data);
      setSent(true);
    } catch (error) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex max-w-[560px] flex-col gap-4">
        <Notice tone="info">Thanks. We got your message and will reply by email.</Notice>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-[560px] flex-col gap-5">
      {problem ? <Notice>{problem}</Notice> : null}
      {subject === "suggest-artist" ? (
        <Notice tone="info">Artists are added by our administrators. Tell us who they are and where we can hear their music.</Notice>
      ) : null}
      <Field label="Your name" autoComplete="name" value={name || user?.displayName || ""} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <Field label="Email" type="email" autoComplete="email" inputMode="email" placeholder="name@email.com" value={email || user?.email || ""} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      <SelectField label="What is it about?" value={subject} onChange={(e) => setSubject(e.target.value)}>
        {subjects.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </SelectField>
      <TextAreaField label="Message" value={message} onChange={(e) => setMessage(e.target.value)} error={errors.message} />
      <Button type="submit" size="lg" full disabled={busy}>
        {busy ? "Sending\u2026" : "Send message"}
      </Button>
    </form>
  );
}
