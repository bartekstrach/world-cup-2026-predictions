import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
const sql = neon(databaseUrl!);
const db = drizzle(sql, { schema });

export { sql, db };

export async function testConnection() {
  try {
    const result = await sql`SELECT NOW() as now`;
    console.log("Neon connected:", result[0]);
    return true;
  } catch (error) {
    console.error("Connection failed:", error);
    return false;
  }
}
