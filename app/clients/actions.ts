"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, deleteClient, updateClient } from "@/app/lib/clients";
import { clientInput, fieldErrors } from "@/app/lib/validation";
import type { FormState } from "@/app/lib/form-state";

export async function saveClient(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }

  const parsed = clientInput.safeParse(values);
  if (!parsed.success) {
    // The logo field keeps its own state; echoing a few hundred KB back to
    // the browser would only slow the error down.
    const echo = { ...values };
    delete echo.logo;
    return { errors: fieldErrors(parsed.error), values: echo };
  }

  if (values.id) await updateClient(values.id, parsed.data);
  else await createClient(parsed.data);

  revalidatePath("/clients");
  revalidatePath("/invoices");
  redirect("/clients"); // Throws by design — must stay outside any try/catch.
}

export async function removeClient(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  await deleteClient(id);
  revalidatePath("/clients");
  revalidatePath("/invoices");
  redirect("/clients");
}
