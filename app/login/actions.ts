"use server";

import { redirect } from "next/navigation";

import { createSession, destroySession, passwordMatches } from "@/app/lib/session";
import { checkLock, clearAttempts, clientIp, recordFailure } from "@/app/lib/rate-limit";

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

function waitMessage(until: Date): string {
  const minutes = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const ip = await clientIp();

  const lock = await checkLock(ip);
  if (lock.locked) return { error: waitMessage(lock.until) };

  const password = formData.get("password");
  const destination = safeDestination(formData.get("from"));

  if (typeof password !== "string" || password.length === 0) {
    return { error: "Enter the password to continue." };
  }

  if (!passwordMatches(password)) {
    const now = await recordFailure(ip);
    return { error: now.locked ? waitMessage(now.until) : "That password didn't match." };
  }

  await clearAttempts(ip);
  await createSession();
  redirect(destination); // Throws by design — must stay outside any try/catch.
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/login");
}
