"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, passwordMatches } from "@/app/lib/session";

export type SignInState = { error: string | null };

/**
 * Only ever redirect to a path on this site. Without this check, a crafted
 * ?from=https://example.com would turn the login page into an open redirect.
 */
function safeDestination(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  const isRelativePath = value.startsWith("/") && !value.startsWith("//");
  return isRelativePath ? value : "/";
}

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const password = formData.get("password");
  const destination = safeDestination(formData.get("from"));

  if (typeof password !== "string" || password.length === 0) {
    return { error: "Enter the password to continue." };
  }

  // TODO(before deploy): rate-limit by IP against the auth_attempts table.
  // One shared password on a public URL is guessable, and there is nothing
  // here yet to slow a script down. Landing with the database work.
  if (!passwordMatches(password)) {
    return { error: "That password didn't match." };
  }

  await createSession();
  redirect(destination); // Throws by design — must stay outside any try/catch.
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/login");
}
