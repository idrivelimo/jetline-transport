import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

import type { Booking, Settings } from "./schema";
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

  masthead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  company: { fontFamily: "Times-Roman", fontSize: 21, color: INK, marginBottom: 8 },
  contact: { fontSize: 8.5, color: SLATE, lineHeight: 1.6 },
  hstNumber: { fontSize: 8.5, color: SLATE, marginTop: 6 },
  docBlock: { alignItems: "flex-end" },
  docTitle: { fontFamily: "Times-Roman", fontSize: 14, color: INK },
  issued: { fontSize: 8.5, color: SLATE, marginTop: 5 },

  brassRule: { height: 2, backgroundColor: BRASS, marginTop: 22, marginBottom: 18 },
  period: { fontSize: 10, color: INK, marginBottom: 18 },

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

function InvoiceDocument({
  settings,
  bookings,
  taxed,
  issuedOn,
}: {
  settings: Settings;
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
        <View style={styles.masthead}>
          <View>
            <Text style={styles.company}>{settings.companyName}</Text>
            <Text style={styles.contact}>{settings.address}</Text>
            <Text style={styles.contact}>{settings.phone}</Text>
            <Text style={styles.contact}>{settings.email}</Text>
            {settings.hstNumber && (
              <Text style={styles.hstNumber}>HST {settings.hstNumber}</Text>
            )}
          </View>
          <View style={styles.docBlock}>
            <Text style={styles.docTitle}>Invoice</Text>
            <Text style={styles.issued}>Issued {formatDateRange(issuedOn, issuedOn)}</Text>
          </View>
        </View>

        <View style={styles.brassRule} />

        <Text style={styles.period}>
          {count === 1 ? "One trip on " : `${count} trips from `}
          {formatDateRange(first, last)}
        </Text>

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
  bookings: Booking[],
  taxed: Set<string>,
): Promise<Buffer> {
  const issuedOn = todayInTimezone(settings.timezone);
  return renderToBuffer(
    <InvoiceDocument
      settings={settings}
      bookings={bookings}
      taxed={taxed}
      issuedOn={issuedOn}
    />,
  );
}
