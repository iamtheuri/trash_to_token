import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Set NEXT_PUBLIC_DB_URL in .env locally and in the Vercel project settings
const sql = neon(process.env.NEXT_PUBLIC_DB_URL);
export const db = drizzle(sql, { schema });
