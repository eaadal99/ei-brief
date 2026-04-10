/**
 * PostgreSQL connection pool.
 *
 * Uses DATABASE_URL from environment. SSL is enabled in production
 * (Railway provides it automatically).
 */

import pg from 'pg';

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

/**
 * Execute a parameterised query.
 * @param {string} text - SQL query with $1, $2, ... placeholders
 * @param {any[]} params - Parameter values
 * @returns {Promise<pg.QueryResult>}
 */
export function query(text, params) {
  return pool.query(text, params);
}
