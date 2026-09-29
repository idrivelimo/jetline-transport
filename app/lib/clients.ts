import "server-only";

import { randomUUID } from "node:crypto";

import { clientRef, clientsCollection, db, hasCode, NOT_FOUND } from "./db";
import type { Client } from "./schema";
import { verifySession } from "./dal";
import type { ClientInput } from "./validation";

/**
 * Saved clients, for the "Prepared for" side of an invoice. Invoices aren't
 * stored — each PDF is built on request — so deleting a client leaves nothing
 * pointing at it.
 */

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

export async function listClients(): Promise<Client[]> {
  await verifySession();
  const snapshot = await clientsCollection().get();
  return snapshot.docs.map((doc) => doc.data()).sort(byName);
}

/**
 * Names only, for pickers. Each document can carry a few hundred KB of logo,
 * and a dropdown has no use for it.
 */
export async function listClientNames(): Promise<{ id: string; name: string }[]> {
  await verifySession();
  const snapshot = await db().collection("clients").select("name").get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, name: String(doc.get("name") ?? "") }))
    .sort(byName);
}

export async function getClient(id: string): Promise<Client | null> {
  await verifySession();
  const snapshot = await clientRef(id)?.get();
  return snapshot?.data() ?? null;
}

export async function createClient(input: ClientInput): Promise<Client> {
  await verifySession();
  const now = new Date();
  const client: Client = { id: randomUUID(), ...input, createdAt: now, updatedAt: now };
  await clientsCollection().doc(client.id).create(client);
  return client;
}

/** `update` refuses to create, so a client deleted in another tab stays deleted. */
export async function updateClient(id: string, input: ClientInput): Promise<void> {
  await verifySession();
  const ref = clientRef(id);
  if (!ref) return;
  try {
    await ref.update({ ...input, updatedAt: new Date() });
  } catch (error) {
    if (!hasCode(error, NOT_FOUND)) throw error;
  }
}

export async function deleteClient(id: string): Promise<void> {
  await verifySession();
  await clientRef(id)?.delete();
}
