import { hasSession, unauthorized } from "@/app/lib/dal";
import { getBookingsForInvoice } from "@/app/lib/invoices";
import { getClient } from "@/app/lib/clients";
import { getSettings } from "@/app/lib/settings";
import { buildInvoicePdf } from "@/app/lib/invoice-document";

/**
 * Builds the invoice PDF for the selected trips.
 *
 * A Route Handler is a public endpoint, so it checks the session itself and
 * answers 401 rather than redirecting — a download following a redirect to an
 * HTML login page just saves the login page.
 */
export async function POST(request: Request): Promise<Response> {
  if (!(await hasSession())) return unauthorized();

  const form = await request.formData();
  const ids = form
    .getAll("bookingId")
    .filter((v): v is string => typeof v === "string");

  // A row only carries HST if it is also on the invoice — a stale taxedId for
  // an unticked row must not put tax on something that isn't being billed.
  const taxedPosted = new Set(
    form.getAll("taxedId").filter((v): v is string => typeof v === "string"),
  );
  const taxed = new Set(ids.filter((id) => taxedPosted.has(id)));

  if (ids.length === 0) {
    return new Response("Select at least one trip to invoice.", { status: 400 });
  }

  // "Prepared for" is optional; an unknown or deleted client just leaves it off.
  const clientId = form.get("clientId");

  // Read the rows back from the database rather than trusting posted amounts.
  const [settings, client, bookings] = await Promise.all([
    getSettings(),
    typeof clientId === "string" && clientId ? getClient(clientId) : null,
    getBookingsForInvoice(ids),
  ]);

  if (bookings.length === 0) {
    return new Response("Those trips no longer exist.", { status: 404 });
  }

  const pdf = await buildInvoicePdf(settings, client, bookings, taxed);

  const first = bookings[0].pickupDate;
  const last = bookings[bookings.length - 1].pickupDate;
  const filename = first === last ? `invoice-${first}.pdf` : `invoice-${first}-to-${last}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.length),
      // A bill should never come from a cache.
      "Cache-Control": "no-store",
    },
  });
}
