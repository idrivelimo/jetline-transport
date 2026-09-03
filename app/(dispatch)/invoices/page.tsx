import { listForInvoice } from "@/app/lib/invoices";
import { getSettings } from "@/app/lib/settings";
import { monthBounds, todayInTimezone } from "@/app/lib/format";
import { InvoiceBuilder } from "@/app/components/invoice-builder";

export default async function InvoicesPage(props: PageProps<"/invoices">) {
  const params = await props.searchParams;
  const settings = await getSettings();

  // Most invoicing is monthly, so the current month is the opening position.
  const thisMonth = monthBounds(todayInTimezone(settings.timezone));
  const from = typeof params.from === "string" ? params.from : thisMonth.from;
  const to = typeof params.to === "string" ? params.to : thisMonth.to;
  const includeCanceled = params.includeCanceled === "on";

  const bookings = await listForInvoice({ from, to, includeCanceled });

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-[26px] leading-tight font-medium text-ink">
          Invoices
        </h1>
        <p className="mt-1 text-sm text-slate">
          Choose the dates, untick anything you&rsquo;re not billing, then download.
        </p>
      </div>

      <form
        method="get"
        className="mb-5 flex flex-wrap items-end gap-x-5 gap-y-3 border border-rule bg-card px-5 py-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="from" className="text-sm font-medium text-ink">From</label>
          <input
            id="from" name="from" type="date" defaultValue={from}
            className="rounded-sm border border-rule bg-card px-3 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="to" className="text-sm font-medium text-ink">To</label>
          <input
            id="to" name="to" type="date" defaultValue={to}
            className="rounded-sm border border-rule bg-card px-3 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 pb-2 text-sm text-ink">
          <input
            type="checkbox" name="includeCanceled" defaultChecked={includeCanceled}
            className="size-4 accent-brass"
          />
          Include canceled trips
        </label>

        <button
          type="submit"
          className="ml-auto rounded-sm bg-ink px-4 py-2 text-sm font-medium text-card transition-colors hover:bg-ink-soft"
        >
          Show trips
        </button>
      </form>

      {bookings.length === 0 ? (
        <div className="border border-rule bg-card px-5 py-12 text-center">
          <p className="text-sm text-slate">
            No trips between these dates.{" "}
            {!includeCanceled && "Canceled trips are left out unless you ask for them."}
          </p>
        </div>
      ) : (
        <InvoiceBuilder bookings={bookings} includeCanceled={includeCanceled} />
      )}
    </>
  );
}
