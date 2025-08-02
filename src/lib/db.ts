import { Pool } from 'pg';
import { decript } from "@/lib/main";

const url = process.env.DATABASE_URL;
const key = process.env.KEY

const pool = new Pool({
  connectionString: decript(url ? url : "", key ? key : ""),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;

