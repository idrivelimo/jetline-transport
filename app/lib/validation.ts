import { z } from "zod";

/**
 * One schema for the booking form, used by both the create and edit actions.
 *
 * Money stays a string the whole way through: parsing a price into a float and
 * back is how cents go missing.
 */

const required = (field: string) => z.string().trim().min(1, `${field} is required.`);

export const bookingInput = z.object({
  customerName: required("Customer name"),
  phone: required("Phone number"),

  // The form sends "" for an untouched optional field.
  email: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
      message: "Enter a valid email address, or leave it blank.",
    }),

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

  notes: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
});

export type BookingInput = z.infer<typeof bookingInput>;

/** Flattens a Zod error into { field: message } for rendering beside inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
