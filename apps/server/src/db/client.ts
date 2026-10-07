import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../env.js";
import * as schema from "./schema.js";

export const pool = new Pool({ connectionString: env.databaseUrl, max: 10 });

export const db = drizzle(pool, { schema });

export type Db = typeof db;

export const pingDatabase = async (): Promise<void> => {
  await pool.query("select 1");
};

export const closeDatabase = async (): Promise<void> => {
  await pool.end();
};
