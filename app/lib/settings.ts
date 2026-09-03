import "server-only";

import { eq } from "drizzle-orm";

import { db } from "./db";
import { settings, type Settings } from "./schema";
import { verifySession } from "./dal";

/**
 * The single settings row. It is the invoice letterhead, and its timezone
 * decides how every booking's local date and time resolve into an instant —
 * so changing it changes what "9pm" means for bookings entered afterwards.
 */

export async function getSettings(): Promise<Settings> {
  await verifySession();
  const [row] = await db().select().from(settings).where(eq(settings.id, 1));
  return row;
}

export type SettingsInput = {
  companyName: string;
  phone: string;
  email: string;
  address: string;
  timezone: string;
};

export async function updateSettings(input: SettingsInput): Promise<void> {
  await verifySession();
  await db()
    .update(settings)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(settings.id, 1));
}

/** Every IANA zone the runtime knows, for the Settings picker. */
export function supportedTimezones(): string[] {
  return Intl.supportedValuesOf("timeZone");
}
