"use client";

import { useActionState } from "react";
import Link from "next/link";

import { saveClient } from "@/app/clients/actions";
import { EMPTY_FORM, type FormState } from "@/app/lib/form-state";
import { LogoField } from "./logo-field";

function Field({
  name, label, state, values, type = "text", required, hint,
}: {
  name: string;
  label: string;
  state: FormState;
  values: Record<string, string>;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  const error = state.errors[name];
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={values[name] ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`rounded-sm border bg-card px-3 py-2 text-[15px] text-ink focus:outline-none ${
          error ? "border-brass" : "border-rule focus:border-brass"
        }`}
      />
      {error ? (
        <p id={`${name}-error`} role="alert" className="text-[13px] text-ink-soft">{error}</p>
      ) : (
        hint && <p className="text-[13px] text-slate">{hint}</p>
      )}
    </div>
  );
}

export function ClientForm({
  initial = {},
  submitLabel,
}: {
  initial?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    saveClient,
    { ...EMPTY_FORM, values: initial },
  );

  const values = Object.keys(state.values).length > 0 ? state.values : initial;
  const shared = { state, values };

  return (
    <form action={formAction} className="max-w-2xl">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field
            {...shared}
            name="name"
            label="Client name"
            required
            hint="Printed under “Prepared for” on the invoice."
          />
        </div>

        <div className="sm:col-span-2">
          <LogoField initial={initial.logo ?? ""} label="Logo" error={state.errors.logo} />
        </div>

        <Field {...shared} name="email" label="Email (optional)" type="email" />
        <Field {...shared} name="phone" label="Phone (optional)" type="tel" />

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="address" className="text-sm font-medium text-ink">
            Address (optional)
          </label>
          <textarea
            id="address"
            name="address"
            rows={3}
            defaultValue={values.address ?? ""}
            className="rounded-sm border border-rule bg-card px-3 py-2 text-[15px] text-ink focus:border-brass focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-7 flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-sm bg-brass px-4 py-2.5 text-[15px] font-medium text-card
                     transition-colors hover:bg-[#96722f] disabled:opacity-60"
        >
          {isPending ? "Saving" : submitLabel}
        </button>
        <Link href="/clients" className="text-sm text-slate underline-offset-2 hover:text-ink hover:underline">
          Discard
        </Link>
      </div>
    </form>
  );
}
