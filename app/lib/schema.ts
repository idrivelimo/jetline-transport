import {
  pgTable,
  uuid,
  text,
  date,
  time,
  timestamp,
  integer,
  numeric,
} from "drizzle-orm/pg-core";

import type { StoredStatus } from "./booking-status";

/**
 * Types and query surface for the schema.
 *
 * Netlify applies the SQL in netlify/database/migrations/ — Drizzle does not run
 * migrations here. This file must be kept in step with those files by hand; a
 * schema change means a new migration, never an edit to an applied one.
 */

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),

  // As the operator typed them, in company-local time.
  pickupDate: date("pickup_date", { mode: "string" }).notNull(),
  pickupTime: time("pickup_time").notNull(),

  // The same moment as an absolute instant. Everything that compares against
  // "now" reads this, never the two columns above.
  pickupAt: timestamp("pickup_at", { withTimezone: true, mode: "date" }).notNull(),

  pickupLocation: text("pickup_location").notNull(),
  dropoffLocation: text("dropoff_location").notNull(),
  vehicle: text("vehicle").notNull(),
  passengers: integer("passengers").notNull(),

  // Money stays a string end to end: numeric parsed into a float loses cents.
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),

  notes: text("notes"),

  status: text("status").$type<StoredStatus>().notNull().default("scheduled"),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),

  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  companyName: text("company_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  timezone: text("timezone").notNull().default("America/Toronto"),

  // Printed on invoices so the customer can claim an input tax credit. Null
  // when the operator isn't registered for HST.
  hstNumber: text("hst_number"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const authAttempts = pgTable("auth_attempts", {
  ip: text("ip").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Settings = typeof settings.$inferSelect;
