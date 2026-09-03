"use client";

import { useActionState } from "react";

import { saveSettings } from "@/app/settings/actions";
import { EMPTY_FORM, type FormState } from "@/app/lib/form-state";

export function SettingsForm({
  initial,
  timezones,
}: {
  initial: Record<string, string>;
  timezones: string[];
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    saveSettings,
    { ...EMPTY_FORM, values: initial },
  );

  const values = Object.keys(state.values).length > 0 ? state.values : initial;
  const saved = state.values.saved === "1" && Object.keys(state.errors).length === 0;

  const field = (name: string, label: string, type = "text") => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={values[name] ?? ""}
        aria-invalid={state.errors[name] ? true : undefined}
        aria-describedby={state.errors[name] ? `${name}-error` : undefined}
        className={`rounded-sm border bg-card px-3 py-2 text-[15px] text-ink focus:outline-none ${
          state.errors[name] ? "border-brass" : "border-rule focus:border-brass"
        }`}
      />
      {state.errors[name] && (
        <p id={`${name}-error`} role="alert" className="text-[13px] text-ink-soft">
          {state.errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <form action={formAction} className="max-w-xl">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">{field("companyName", "Company name")}</div>
        {field("phone", "Phone", "tel")}
        {field("email", "Email", "email")}

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="address" className="text-sm font-medium text-ink">
            Address
          </label>
          <textarea
            id="address"
            name="address"
            rows={3}
            defaultValue={values.address ?? ""}
            className="rounded-sm border border-rule bg-card px-3 py-2 text-[15px] text-ink focus:border-brass focus:outline-none"
          />
          {state.errors.address && (
            <p role="alert" className="text-[13px] text-ink-soft">{state.errors.address}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="hstNumber" className="text-sm font-medium text-ink">
            HST number
          </label>
          <input
            id="hstNumber"
            name="hstNumber"
            type="text"
            defaultValue={values.hstNumber ?? ""}
            placeholder="123456789 RT0001"
            className="rounded-sm border border-rule bg-card px-3 py-2 text-[15px] text-ink
                       placeholder:text-slate/60 focus:border-brass focus:outline-none"
          />
          <p className="text-[13px] text-slate">
            Printed on invoices so customers can claim the tax back. Leave it
            blank if you aren&rsquo;t registered for HST.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="timezone" className="text-sm font-medium text-ink">
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={values.timezone ?? ""}
            className="rounded-sm border border-rule bg-card px-3 py-2 text-[15px] text-ink focus:border-brass focus:outline-none"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
          <p className="text-[13px] text-slate">
            Sets what a pickup time means when you enter a booking. Bookings already
            saved keep the moment they were entered with.
          </p>
          {state.errors.timezone && (
            <p role="alert" className="text-[13px] text-ink-soft">{state.errors.timezone}</p>
          )}
        </div>
      </div>

      <div className="mt-7 flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-sm bg-brass px-4 py-2.5 text-[15px] font-medium text-card
                     transition-colors hover:bg-[#96722f] disabled:opacity-60"
        >
          {isPending ? "Saving" : "Save settings"}
        </button>
        {saved && <p className="text-sm text-slate">Settings saved.</p>}
      </div>
    </form>
  );
}
