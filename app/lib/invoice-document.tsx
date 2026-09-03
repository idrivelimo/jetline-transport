import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

import type { Booking, Settings } from "./schema";
import { formatDateShort, formatMoney, sumMoney } from "./format";

/**
 * The invoice PDF.
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
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontFamily: "Helvetica", fontSize: 9.5, color: INK },

  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  company: { fontFamily: "Times-Roman", fontSize: 20, color: INK, marginBottom: 6 },
  contact: { fontSize: 9, color: SLATE, lineHeight: 1.5 },
  titleBlock: { alignItems: "flex-end" },
  title: { fontFamily: "Times-Roman", fontSize: 15, color: INK },
  period: { fontSize: 9, color: SLATE, marginTop: 4 },

  brassRule: { height: 2, backgroundColor: BRASS, marginTop: 18, marginBottom: 20 },

  row: { flexDirection: "row", paddingVertical: 7 },
  headerRow: { flexDirection: "row", paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: INK },
  divider: { borderBottomWidth: 0.5, borderBottomColor: RULE },

  colDate: { width: 62 },
  colCustomer: { width: 108 },
  colRoute: { flex: 1, paddingRight: 10 },
  colVehicle: { width: 58 },
  colAmount: { width: 66, textAlign: "right" },

  headerText: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: SLATE },
  muted: { color: SLATE },

  totalRow: { flexDirection: "row", marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: INK },
  totalLabel: { flex: 1, textAlign: "right", paddingRight: 10, fontSize: 10, color: SLATE },
  totalValue: { width: 66, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 13, color: BRASS },

  footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 8, color: SLATE, textAlign: "center" },
});

function period(bookings: Booking[]): string {
  if (bookings.length === 0) return "";
  const first = formatDateShort(bookings[0].pickupDate);
  const last = formatDateShort(bookings[bookings.length - 1].pickupDate);
  return first === last ? first : `${first} to ${last}`;
}

function InvoiceDocument({ settings, bookings }: { settings: Settings; bookings: Booking[] }) {
  const total = sumMoney(bookings.map((b) => b.price));

  return (
    <Document title={`Invoice — ${settings.companyName}`} author={settings.companyName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.head}>
          <View>
            <Text style={styles.company}>{settings.companyName}</Text>
            <Text style={styles.contact}>{settings.address}</Text>
            <Text style={styles.contact}>{settings.phone}</Text>
            <Text style={styles.contact}>{settings.email}</Text>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Invoice</Text>
            <Text style={styles.period}>{period(bookings)}</Text>
          </View>
        </View>

        <View style={styles.brassRule} />

        <View style={styles.headerRow}>
          <Text style={[styles.headerText, styles.colDate]}>Date</Text>
          <Text style={[styles.headerText, styles.colCustomer]}>Customer</Text>
          <Text style={[styles.headerText, styles.colRoute]}>Route</Text>
          <Text style={[styles.headerText, styles.colVehicle]}>Vehicle</Text>
          <Text style={[styles.headerText, styles.colAmount]}>Amount</Text>
        </View>

        {bookings.map((b) => (
          <View key={b.id} style={[styles.row, styles.divider]} wrap={false}>
            <Text style={styles.colDate}>{formatDateShort(b.pickupDate)}</Text>
            <Text style={styles.colCustomer}>{b.customerName}</Text>
            <Text style={styles.colRoute}>
              {b.pickupLocation} <Text style={styles.muted}>to</Text> {b.dropoffLocation}
              {b.status === "canceled" ? <Text style={styles.muted}> (canceled)</Text> : ""}
            </Text>
            <Text style={styles.colVehicle}>{b.vehicle}</Text>
            <Text style={styles.colAmount}>{formatMoney(b.price)}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatMoney(total)}</Text>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : ""
          }
          fixed
        />
      </Page>
    </Document>
  );
}

export async function buildInvoicePdf(
  settings: Settings,
  bookings: Booking[],
): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument settings={settings} bookings={bookings} />);
}
