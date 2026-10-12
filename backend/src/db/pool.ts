import { Pool, types } from 'pg';
import { config } from '../config';

// Return BIGINT (e.g. SUM/COUNT results) as JS numbers instead of strings.
// Safe here: revenue in cents stays far below Number.MAX_SAFE_INTEGER.
types.setTypeParser(types.builtins.INT8, (value) => Number(value));

export function createPool(connectionString = config.databaseUrl): Pool {
  const pool = new Pool({ connectionString });
  // When Postgres drops an idle connection (restart, network blip) the pool
  // emits 'error'. Unhandled, that event crashes the Node process. The pool
  // already discards the broken client and opens a new one on the next query,
  // so logging is all that's needed.
  pool.on('error', (err) => {
    console.error('Idle Postgres connection lost:', err.message);
  });
  return pool;
}
