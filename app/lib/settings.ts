import "server-only";

import { ALREADY_EXISTS, hasCode, settingsDoc } from "./db";
import type { Settings } from "./schema";
import { verifySession } from "./dal";

/**
 * The single settings document. It is the invoice letterhead, and its timezone
 * decides how every booking's local date and time resolve into an instant —
 * so changing it changes what "9pm" means for bookings entered afterwards.
 */

/**
 * Placeholders, so the Settings screen has something to edit rather than a
 * null state. Also fills any field added after the document was first
 * written: Firestore has no migrations to backfill one.
 */
const DEFAULTS: Omit<Settings, "updatedAt"> = {
  companyName: "Jetline",
  phone: "",
  email: "",
  address: "",
  timezone: "America/Toronto",
  hstNumber: null,
  legalName: null,
  logo: null,
};

export async function getSettings(): Promise<Settings> {
  await verifySession();
  const ref = settingsDoc();

  const snapshot = await ref.get();
  if (snapshot.exists) return { ...DEFAULTS, ...snapshot.data()! };

  // First run. `create` fails if a concurrent request got there first, in
  // which case theirs is the document.
  const seeded: Settings = { ...DEFAULTS, updatedAt: new Date() };
  try {
    await ref.create(seeded);
    return seeded;
  } catch (error) {
    if (!hasCode(error, ALREADY_EXISTS)) throw error;
    return { ...DEFAULTS, ...(await ref.get()).data()! };
  }
}

export type SettingsInput = Omit<Settings, "updatedAt">;

export async function updateSettings(input: SettingsInput): Promise<void> {
  await verifySession();
  await settingsDoc().set({ ...input, updatedAt: new Date() });
}

/** Every IANA zone the runtime knows, for the Settings picker. */
export function supportedTimezones(): string[] {
  return Intl.supportedValuesOf("timeZone");
}
