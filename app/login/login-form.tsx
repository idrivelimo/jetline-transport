"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";

const INITIAL: SignInState = { error: null };

export function LoginForm({ from }: { from: string }) {
  const [state, formAction, isPending] = useActionState(signIn, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="from" value={from} />

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          aria-describedby={state.error ? "password-error" : undefined}
          aria-invalid={state.error ? true : undefined}
          className="w-full rounded-sm border border-rule bg-white px-3 py-2.5 text-[15px] text-ink
                     placeholder:text-slate/60 focus:border-brass focus:outline-none"
        />
        {state.error && (
          <p id="password-error" role="alert" className="text-sm text-ink-soft">
            {state.error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-sm bg-brass px-4 py-2.5 text-[15px] font-medium text-card
                   transition-colors hover:bg-[#96722f] disabled:opacity-60"
      >
        {isPending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
