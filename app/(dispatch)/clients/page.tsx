import Link from "next/link";

import { listClients } from "@/app/lib/clients";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-[26px] leading-tight font-medium text-ink">Clients</h1>
          <p className="mt-1 text-sm text-slate">
            Saved here, a client can be picked for &ldquo;Prepared for&rdquo; on any invoice.
          </p>
        </div>
        <Link
          href="/clients/new"
          className="rounded-sm bg-ink px-4 py-2 text-center text-sm font-medium text-card
                     transition-colors hover:bg-ink-soft"
        >
          Add a client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="border border-rule bg-card px-4 py-12 text-center sm:px-5">
          <p className="text-sm text-slate">No clients yet. Add the first one.</p>
        </div>
      ) : (
        <ul className="border border-rule bg-card">
          {clients.map((client) => (
            <li
              key={client.id}
              className="flex items-center gap-4 border-b border-rule px-4 py-3 last:border-b-0 sm:px-5"
            >
              <div className="flex h-12 w-24 shrink-0 items-center justify-center bg-white">
                {client.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={client.logo} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-slate">No logo</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/clients/${client.id}/edit`}
                  className="text-[15px] font-medium text-ink underline-offset-2 hover:underline"
                >
                  {client.name}
                </Link>
                {(client.email || client.phone) && (
                  <p className="mt-0.5 truncate text-[13px] text-slate">
                    {[client.phone, client.email].filter(Boolean).join("  |  ")}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
