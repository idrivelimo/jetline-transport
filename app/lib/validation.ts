import { z } from "zod";

import { checkLogo } from "./logo";

/**
 * One schema for the booking form, used by both the create and edit actions.
 *
 * Money stays a string the whole way through: parsing a price into a float and
 * back is how cents go missing.
 */

const required = (field: string) => z.string().trim().min(1, `${field} is required.`);

// The form sends "" for an untouched optional field.
const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

const optionalEmail = optional.refine(
  (v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
  { message: "Enter a valid email address, or leave it blank." },
);

/** A PNG or JPEG data URL, or "" for none. See app/lib/logo.ts. */
export const logoField = z.string().transform((value, ctx) => {
  const result = checkLogo(value);
  if (!result.ok) {
    ctx.addIssue({ code: "custom", message: result.error });
    return z.NEVER;
  }
  return result.logo;
});

export const bookingInput = z.object({
  customerName: required("Customer name"),
  phone: required("Phone number"),
  email: optionalEmail,

  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  pickupTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Pick a pickup time."),

  pickupLocation: required("Pickup location"),
  dropoffLocation: required("Drop-off location"),
  vehicle: required("Vehicle"),

  passengers: z.coerce
    .number()
    .int("Passengers must be a whole number.")
    .min(1, "A trip needs at least one passenger."),

  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a price like 145 or 145.50."),

  notes: optional,
});

export type BookingInput = z.infer<typeof bookingInput>;

/** Who an invoice is prepared for. Only the name is needed to print one. */
export const clientInput = z.object({
  name: required("Client name"),
  address: optional,
  email: optionalEmail,
  phone: optional,
  logo: logoField,
});

export type ClientInput = z.infer<typeof clientInput>;

/** Flattens a Zod error into { field: message } for rendering beside inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
