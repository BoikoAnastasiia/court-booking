import { Pool, types } from 'pg';
import { config } from '../config';

// Return BIGINT (e.g. SUM/COUNT results) as JS numbers instead of strings.
// Safe here: revenue in cents stays far below Number.MAX_SAFE_INTEGER.
types.setTypeParser(types.builtins.INT8, (value) => Number(value));

export function createPool(connectionString = config.databaseUrl): Pool {
  return new Pool({ connectionString });
}
