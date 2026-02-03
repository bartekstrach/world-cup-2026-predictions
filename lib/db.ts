import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

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
