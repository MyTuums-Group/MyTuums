import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@workspace/config";
import * as schema from "./schema";

const connectionString = env.DATABASE_URL;

// Disable prefetch for serverless/edge compatibility
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
