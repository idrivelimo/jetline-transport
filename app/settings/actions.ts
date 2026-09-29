"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { supportedTimezones, updateSettings } from "@/app/lib/settings";
import { fieldErrors, logoField } from "@/app/lib/validation";
import type { FormState } from "@/app/lib/form-state";

const required = (field: string) => z.string().trim().min(1, `${field} is required.`);

const settingsInput = z.object({
  companyName: required("Company name"),
  phone: required("Phone"),
  email: required("Email"),
  // Optional: the letterhead reads fine without one, and a required field
  // here silently blocked saving for anyone with nothing to put in it.
  address: z.string().trim(),
  timezone: z
    .string()
    .refine((v) => supportedTimezones().includes(v), "Choose a timezone from the list."),

  // Optional: an operator under the small-supplier threshold has no number,
  // and their invoices then carry no HST line.
  hstNumber: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),

  // Optional: only a business trading under another name has one.
  legalName: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),

  logo: logoField,
});

export async function saveSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$")) values[k] = v;
  }

  // The logo field keeps its own state; echoing a few hundred KB back to the
  // browser on every save would only slow the form down.
  const echo = { ...values };
  delete echo.logo;

  const parsed = settingsInput.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: echo };

  try {
    await updateSettings(parsed.data);
  } catch (error) {
    // Shown beside the Save button, so a failed write can't pass for a save.
    console.error("Saving settings failed:", error);
    return {
      errors: { form: "Couldn’t save to the database. Try again in a moment." },
      values: echo,
    };
  }
  revalidatePath("/");

  // `saved` drives the confirmation line; it is not a settings field.
  return { errors: {}, values: { ...echo, saved: "1" } };
}
