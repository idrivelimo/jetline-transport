import Link from "next/link";

import { verifySession } from "@/app/lib/dal";
import { signOut } from "@/app/login/actions";
import { FilterTabs } from "@/app/components/filter-tabs";

/**
 * Chrome for every signed-in screen. The band recedes so the run sheet is the
 * page; the wordmark is the only serif up here.
 */
export default async function DispatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="bg-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
          <Link
            href="/"
            className="font-serif text-xl font-semibold tracking-tight text-card"
          >
            Jetline
          </Link>

          <FilterTabs />

          <div className="ml-auto flex items-center gap-x-5">
            <Link
              href="/invoices"
              className="text-sm text-rule/70 transition-colors hover:text-card"
            >
              Invoices
            </Link>
            <Link
              href="/settings"
              className="text-sm text-rule/70 transition-colors hover:text-card"
            >
              Settings
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-rule/70 transition-colors hover:text-card"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
