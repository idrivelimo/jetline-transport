"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { supportedTimezones, updateSettings } from "@/app/lib/settings";
import { fieldErrors } from "@/app/lib/validation";
import type { FormState } from "@/app/lib/form-state";

const required = (field: string) => z.string().trim().min(1, `${field} is required.`);

const settingsInput = z.object({
  companyName: required("Company name"),
  phone: required("Phone"),
  email: required("Email"),
  address: required("Address"),
  timezone: z
    .string()
    .refine((v) => supportedTimezones().includes(v), "Choose a timezone from the list."),

  // Optional: an operator under the small-supplier threshold has no number,
  // and their invoices then carry no HST line.
  hstNumber: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
});

export async function saveSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$")) values[k] = v;
  }

  const parsed = settingsInput.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  await updateSettings(parsed.data);
  revalidatePath("/");

  // `saved` drives the confirmation line; it is not a settings field.
  return { errors: {}, values: { ...values, saved: "1" } };
}
