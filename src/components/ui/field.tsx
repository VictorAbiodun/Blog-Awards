"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

interface BaseProps {
  label: string;
  hint?: string;
  error?: string;
  /** "ground" for fields that sit on an elevated panel. */
  tone?: "elevated" | "ground";
}

const inputClass = (tone: "elevated" | "ground", invalid: boolean) =>
  [
    "w-full px-4 text-xl text-ink placeholder:text-muted",
    tone === "elevated" ? "bg-elevated" : "bg-ground",
    invalid ? "outline outline-[3px] outline-orange" : "",
  ].join(" ");

function Wrapper({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[19px] font-medium leading-[1.2]">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-base font-semibold leading-[1.35] text-orange">
          <span aria-hidden="true">! </span>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-base leading-[1.35] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export function Field({ label, hint, error, tone = "elevated", ...input }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${inputClass(tone, Boolean(error))} h-14`}
        {...input}
      />
    </Wrapper>
  );
}

export function PasswordField({ label, hint, error, tone = "elevated", ...input }: BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={`${inputClass(tone, Boolean(error))} h-14 pr-20`}
          {...input}
        />
        <button
          type="button"
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-0 px-4 text-[17px] font-semibold"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </Wrapper>
  );
}

export function TextAreaField({ label, hint, error, tone = "elevated", ...input }: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${inputClass(tone, Boolean(error))} min-h-28 py-3`}
        {...input}
      />
    </Wrapper>
  );
}

export function Checkbox({ label, error, ...input }: { label: ReactNode; error?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-[26px] shrink-0 accent-gold"
          {...input}
        />
        <label htmlFor={id} className="text-lg leading-[1.35]">
          {label}
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-base font-semibold text-orange">
          <span aria-hidden="true">! </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  hint,
  error,
  tone = "elevated",
  children,
  ...input
}: BaseProps & { children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${inputClass(tone, Boolean(error))} h-14`}
        {...input}
      >
        {children}
      </select>
    </Wrapper>
  );
}
