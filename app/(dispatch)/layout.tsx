import Link from "next/link";

import { verifySession } from "@/app/lib/dal";
import { signOut } from "@/app/login/actions";
import { FilterTabs } from "@/app/components/filter-tabs";

/**
 * Chrome for every signed-in screen. The band recedes so the run sheet is the
 * page; the wordmark is the only serif up here.
 *
 * On a phone the tabs drop to their own scrollable row beneath the wordmark
 * and the account links; from `sm` up everything sits on one line.
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
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link
            href="/"
            className="order-1 font-serif text-xl font-semibold tracking-tight text-card"
          >
            Jetline
          </Link>

          <div className="order-3 -mx-4 w-full overflow-x-auto px-4 sm:order-2 sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0">
            <FilterTabs />
          </div>

          <div className="order-2 ml-auto flex items-center gap-x-5 sm:order-3">
            <Link
              href="/invoices"
              className="text-sm text-rule/70 transition-colors hover:text-card"
            >
              Invoices
            </Link>
            <Link
              href="/clients"
              className="text-sm text-rule/70 transition-colors hover:text-card"
            >
              Clients
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
