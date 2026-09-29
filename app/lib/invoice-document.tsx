import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

import type { Booking, Client, Settings } from "./schema";
import {
  formatDateRange,
  formatDayMonth,
  formatMoney,
  todayInTimezone,
} from "./format";
import { HST_LABEL, invoiceTotals } from "./tax";

/**
 * The invoice PDF.
 *
 * The register to aim for is hotel stationery, not a software receipt: a
 * confident masthead, generous air, and one number that carries weight. The
 * brass rule under the letterhead and the brass total are the only colour —
 * the same rule as the app, where brass marks the thing that matters now.
 *
 * Uses the PDF built-in Times-Roman and Helvetica rather than embedding
 * Spectral and IBM Plex. They hold the same serif/sans relationship as the app,
 * with no font binaries in the repo and no runtime download to fail inside a
 * serverless function. Registering the real faces is a drop-in change later.
 */

const INK = "#17212F";
const BRASS = "#A8813C";
const SLATE = "#5A6675";
const RULE = "#D9CFBD";

const styles = StyleSheet.create({
  page: {
    paddingTop: 52,
    paddingBottom: 64,
    paddingHorizontal: 50,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: INK,
  },

  // The letterhead: the operator on the left, who it's prepared for on the
  // right. Logos share one band so the text beneath them lines up whichever
  // side has one; the text rows sit on a common bottom edge.
  logoBand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 64,
    marginBottom: 14,
  },
  ownLogoBox: { width: 200, height: 64 },
  clientLogoBox: { width: 150, height: 48 },
  logoLeft: { width: "100%", height: "100%", objectFit: "contain", objectPositionX: 0 },
  logoRight: { width: "100%", height: "100%", objectFit: "contain", objectPositionX: "100%" },

  masthead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  ownBlock: { flex: 1, paddingRight: 24 },
  clientBlock: { flex: 1, alignItems: "flex-end", textAlign: "right" },
  company: { fontFamily: "Helvetica-Bold", fontSize: 12, color: INK, marginBottom: 5 },
  operatingAs: { fontSize: 9, color: INK, marginBottom: 5 },
  contact: { fontSize: 8.5, color: SLATE, lineHeight: 1.6 },
  hstNumber: { fontSize: 8.5, color: SLATE, marginTop: 3 },
  preparedFor: { fontSize: 9, color: SLATE, marginBottom: 5 },
  clientName: { fontSize: 11.5, color: INK },
  clientDetail: { fontSize: 8.5, color: SLATE, lineHeight: 1.6, textAlign: "right" },

  brassRule: { height: 2, backgroundColor: BRASS, marginTop: 20, marginBottom: 16 },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 18,
  },
  docTitle: { fontFamily: "Times-Roman", fontSize: 16, color: INK, marginBottom: 4 },
  period: { fontSize: 10, color: INK },
  issued: { fontSize: 8.5, color: SLATE },

  headerRow: {
    flexDirection: "row",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: INK,
  },
  headerText: { fontFamily: "Helvetica-Bold", fontSize: 8, color: SLATE },

  row: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
  },

  colDate: { width: 48 },
  colCustomer: { width: 100, paddingRight: 8 },
  colRoute: { flex: 1, paddingRight: 12 },
  colVehicle: { width: 58 },
  colTax: { width: 34 },
  colAmount: { width: 62, textAlign: "right" },

  muted: { color: SLATE },
  routeLine: { lineHeight: 1.4 },

  // A totals block, aligned to the amount column, rather than one more row.
  totals: { alignSelf: "flex-end", width: 230, marginTop: 20 },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: SLATE,
    marginBottom: 5,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 4,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: INK,
  },
  totalLabel: { fontSize: 10.5, color: INK },
  totalValue: { fontFamily: "Helvetica-Bold", fontSize: 15, color: BRASS },

  footer: {
    position: "absolute",
    bottom: 34,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    paddingTop: 9,
    fontSize: 8,
    color: SLATE,
  },
});

/** "416-671-2796  |  info@example.com", skipping whichever is blank. */
const joined = (...parts: (string | null)[]) => parts.filter(Boolean).join("  |  ");

function Letterhead({ settings, client }: { settings: Settings; client: Client | null }) {
  const clientLogo = client?.logo ?? null;
  const contact = joined(settings.phone, settings.email);

  return (
    <>
      {(settings.logo || clientLogo) && (
        <View style={styles.logoBand}>
          {/* react-pdf's Image has no alt; the names are printed as text below. */}
          <View style={styles.ownLogoBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {settings.logo && <Image src={settings.logo} style={styles.logoLeft} />}
          </View>
          <View style={styles.clientLogoBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {clientLogo && <Image src={clientLogo} style={styles.logoRight} />}
          </View>
        </View>
      )}

      <View style={styles.masthead}>
        <View style={styles.ownBlock}>
          <Text style={styles.company}>{settings.legalName ?? settings.companyName}</Text>
          {settings.legalName && (
            <Text style={styles.operatingAs}>operating as {settings.companyName}</Text>
          )}
          {contact && <Text style={styles.contact}>{contact}</Text>}
          {settings.address && <Text style={styles.contact}>{settings.address}</Text>}
          {settings.hstNumber && (
            <Text style={styles.hstNumber}>HST {settings.hstNumber}</Text>
          )}
        </View>

        {client && (
          <View style={styles.clientBlock}>
            <Text style={styles.preparedFor}>Prepared for</Text>
            <Text style={styles.clientName}>{client.name}</Text>
            {client.address && <Text style={styles.clientDetail}>{client.address}</Text>}
            {(client.phone || client.email) && (
              <Text style={styles.clientDetail}>{joined(client.phone, client.email)}</Text>
            )}
          </View>
        )}
      </View>
    </>
  );
}

function InvoiceDocument({
  settings,
  client,
  bookings,
  taxed,
  issuedOn,
}: {
  settings: Settings;
  client: Client | null;
  bookings: Booking[];
  taxed: Set<string>;
  issuedOn: string;
}) {
  const totals = invoiceTotals(
    bookings.map((b) => ({ amount: b.price, taxable: taxed.has(b.id) })),
  );
  const hasTax = totals.tax !== "0.00";
  const first = bookings[0]?.pickupDate ?? issuedOn;
  const last = bookings[bookings.length - 1]?.pickupDate ?? issuedOn;

  // Only spell the year on each line when the invoice straddles two of them.
  const spansYears = first.slice(0, 4) !== last.slice(0, 4);
  const lineDate = (d: string) => (spansYears ? `${formatDayMonth(d)} ${d.slice(0, 4)}` : formatDayMonth(d));

  const count = bookings.length;

  return (
    <Document title={`Invoice — ${settings.companyName}`} author={settings.companyName}>
      <Page size="A4" style={styles.page}>
        <Letterhead settings={settings} client={client} />

        <View style={styles.brassRule} />

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.docTitle}>Invoice</Text>
            <Text style={styles.period}>
              {count === 1 ? "One trip on " : `${count} trips from `}
              {formatDateRange(first, last)}
            </Text>
          </View>
          <Text style={styles.issued}>Issued {formatDateRange(issuedOn, issuedOn)}</Text>
        </View>

        {/* `fixed` repeats the column headings if the trips run to a second page. */}
        <View style={styles.headerRow} fixed>
          <Text style={[styles.headerText, styles.colDate]}>Date</Text>
          <Text style={[styles.headerText, styles.colCustomer]}>Customer</Text>
          <Text style={[styles.headerText, styles.colRoute]}>Route</Text>
          <Text style={[styles.headerText, styles.colVehicle]}>Vehicle</Text>
          {/* A tax column only earns its place when the invoice is mixed. */}
          {totals.mixed && <Text style={[styles.headerText, styles.colTax]}>Tax</Text>}
          <Text style={[styles.headerText, styles.colAmount]}>Amount</Text>
        </View>

        {bookings.map((b) => (
          <View key={b.id} style={styles.row} wrap={false}>
            <Text style={styles.colDate}>{lineDate(b.pickupDate)}</Text>
            <Text style={styles.colCustomer}>{b.customerName}</Text>
            <Text style={[styles.colRoute, styles.routeLine]}>
              {b.pickupLocation} <Text style={styles.muted}>to</Text> {b.dropoffLocation}
              {b.status === "canceled" ? <Text style={styles.muted}> (canceled)</Text> : ""}
            </Text>
            <Text style={styles.colVehicle}>{b.vehicle}</Text>
            {totals.mixed && (
              <Text style={[styles.colTax, styles.muted]}>
                {taxed.has(b.id) ? "HST" : "None"}
              </Text>
            )}
            <Text style={styles.colAmount}>{formatMoney(b.price)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          {hasTax ? (
            <>
              <View style={styles.line}>
                <Text>{count === 1 ? "1 trip" : `${count} trips`}</Text>
                <Text>{formatMoney(totals.subtotal)}</Text>
              </View>
              <View style={styles.line}>
                <Text>
                  {HST_LABEL}
                  {totals.mixed ? " on trips marked above" : ""}
                </Text>
                <Text>{formatMoney(totals.tax)}</Text>
              </View>
            </>
          ) : (
            <View style={styles.line}>
              <Text>{count === 1 ? "1 trip billed" : `${count} trips billed`}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatMoney(totals.total)}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{settings.companyName}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : settings.email
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function buildInvoicePdf(
  settings: Settings,
  client: Client | null,
  bookings: Booking[],
  taxed: Set<string>,
): Promise<Buffer> {
  const issuedOn = todayInTimezone(settings.timezone);
  return renderToBuffer(
    <InvoiceDocument
      settings={settings}
      client={client}
      bookings={bookings}
      taxed={taxed}
      issuedOn={issuedOn}
    />,
  );
}
