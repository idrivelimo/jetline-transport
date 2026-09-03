"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  cancelBooking,
  completeBooking,
  createBooking,
  deleteBooking,
  restoreBooking,
  updateBooking,
} from "@/app/lib/bookings";
import { bookingInput, fieldErrors } from "@/app/lib/validation";
import type { FormState } from "@/app/lib/form-state";

function readValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) out[key] = value;
  }
  return out;
}

export async function saveBooking(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = readValues(formData);
  const parsed = bookingInput.safeParse(values);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values };
  }

  const id = values.id;
  if (id) {
    await updateBooking(id, parsed.data);
  } else {
    await createBooking(parsed.data);
  }

  revalidatePath("/");
  redirect("/"); // Throws by design — must stay outside any try/catch.
}

/**
 * Cancel, restore, mark complete and delete, as one action so each booking row
 * can post a plain form and keep working without JavaScript.
 */
export async function changeBookingStatus(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const intent = formData.get("intent");
  if (typeof id !== "string" || typeof intent !== "string") return;

  switch (intent) {
    case "cancel":
      await cancelBooking(id);
      break;
    case "restore":
      await restoreBooking(id);
      break;
    case "complete":
      await completeBooking(id);
      break;
    case "delete":
      await deleteBooking(id);
      break;
    default:
      return;
  }

  revalidatePath("/");
}
