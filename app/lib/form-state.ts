/**
 * Shared shape for the booking form. Kept out of actions.ts because a
 * "use server" module may only export async functions.
 */
export type FormState = {
  errors: Record<string, string>;
  /** Echoed back so a rejected form doesn't lose what the operator typed. */
  values: Record<string, string>;
};

export const EMPTY_FORM: FormState = { errors: {}, values: {} };
