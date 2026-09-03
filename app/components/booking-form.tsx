"use client";

import { useActionState } from "react";
import Link from "next/link";

import { saveBooking } from "@/app/bookings/actions";
import { EMPTY_FORM, type FormState } from "@/app/lib/form-state";

type FieldProps = {
  name: string;
  label: string;
  errors: Record<string, string>;
  values: Record<string, string>;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  inputMode?: "numeric" | "decimal" | "tel";
  step?: string;
  min?: string;
};

function Field({
  name, label, errors, values, type = "text",
  required, placeholder, className = "", inputMode, step, min,
}: FieldProps) {
  const error = errors[name];
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={name} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        step={step}
        min={min}
        defaultValue={values[name] ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`rounded-sm border bg-card px-3 py-2 text-[15px] text-ink placeholder:text-slate/60
                    focus:outline-none ${error ? "border-brass" : "border-rule focus:border-brass"}`}
      />
      {error && (
        <p id={`${name}-error`} role="alert" className="text-[13px] text-ink-soft">
          {error}
        </p>
      )}
    </div>
  );
}

export function BookingForm({
  initial = {},
  submitLabel,
}: {
  initial?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    saveBooking,
    { ...EMPTY_FORM, values: initial },
  );

  // Keep what the operator typed on a rejected submit; fall back to the row.
  const values = Object.keys(state.values).length > 0 ? state.values : initial;
  const errors = state.errors;
  const shared = { errors, values };

  return (
    <form action={formAction} className="max-w-2xl">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field {...shared} name="customerName" label="Customer name" required />
        <Field {...shared} name="phone" label="Phone" type="tel" required />
        <Field {...shared} name="email" label="Email" type="email" placeholder="Optional" />
        <div className="hidden sm:block" />

        <Field {...shared} name="pickupDate" label="Date" type="date" required />
        <Field {...shared} name="pickupTime" label="Pickup time" type="time" required />

        <Field {...shared} name="pickupLocation" label="Pickup" required className="sm:col-span-2" />
        <Field {...shared} name="dropoffLocation" label="Drop-off" required className="sm:col-span-2" />

        <Field {...shared} name="vehicle" label="Vehicle" placeholder="Sedan, SUV, stretch" required />
        <Field {...shared} name="passengers" label="Passengers" type="number" min="1" inputMode="numeric" required />

        <Field {...shared} name="price" label="Price" inputMode="decimal" placeholder="145.00" required />
        <div className="hidden sm:block" />

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="notes" className="text-sm font-medium text-ink">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={values.notes ?? ""}
            placeholder="Flight number, car seat, meet and greet"
            className="rounded-sm border border-rule bg-card px-3 py-2 text-[15px] text-ink
                       placeholder:text-slate/60 focus:border-brass focus:outline-none"
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
        <Link href="/" className="text-sm text-slate underline-offset-2 hover:text-ink hover:underline">
          Discard
        </Link>
      </div>
    </form>
  );
}
