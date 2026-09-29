/**
 * Logos for the invoice letterhead, stored inline as data URLs.
 *
 * Inline rather than in a storage bucket: a logo is small once resized, the
 * PDF renderer takes a data URL as-is, and there is no second service to set
 * up. The cap keeps a document well inside Firestore's 1 MiB limit and a save
 * inside the 1 MB Server Action body limit.
 *
 * PNG and JPEG only, because those are the formats the PDF renderer can draw.
 * The upload field converts whatever the operator picks into one of them.
 *
 * No Node APIs here: the upload field imports the limits in the browser.
 */

export const MAX_LOGO_BYTES = 350 * 1024;

const PREFIXES = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
} as const;

/** Decoded size of a base64 payload, without decoding it. */
function base64Bytes(payload: string): number {
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return (payload.length * 3) / 4 - padding;
}

export type LogoCheck = { ok: true; logo: string | null } | { ok: false; error: string };

/**
 * "" means no logo. Anything else must be a PNG or JPEG data URL whose bytes
 * really are that format — the prefix alone is just a claim from the form.
 */
export function checkLogo(raw: string): LogoCheck {
  const value = raw.trim();
  if (value === "") return { ok: true, logo: null };

  const match = /^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return { ok: false, error: "The logo must be a PNG or JPEG image." };

  const [, type, payload] = match;
  if (base64Bytes(payload) > MAX_LOGO_BYTES) {
    return { ok: false, error: "That logo is too large. Try a smaller image." };
  }

  const head = atob(payload.slice(0, 8));
  const expected = PREFIXES[type as keyof typeof PREFIXES];
  if (!expected.every((byte, i) => head.charCodeAt(i) === byte)) {
    return { ok: false, error: "The logo must be a PNG or JPEG image." };
  }

  return { ok: true, logo: value };
}
