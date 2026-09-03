import "server-only";

import { getDatabase } from "@netlify/database";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

import * as schema from "./schema";

/**
 * The database client.
 *
 * `@netlify/database` picks the right connection for wherever this is running —
 * the local Postgres under .netlify/db during development, the provisioned
 * branch on a deploy — so there is no connection string to wire up or leak.
 *
 * It returns either a server or a serverless connection; both expose a
 * pg-compatible pool, so we always go through node-postgres. One client type,
 * and transactions work in both.
 */
let client: NodePgDatabase<typeof schema> | null = null;

export function db(): NodePgDatabase<typeof schema> {
  if (!client) {
    const connection = getDatabase();
    client = drizzle(connection.pool as Pool, { schema });
  }
  return client;
}

export { schema };
