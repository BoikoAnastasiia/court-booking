import { createPool } from '../src/db/pool';
import { migrate } from '../src/db/migrate';
import { TEST_DATABASE_URL } from './helpers';

export default async function setup() {
  const pool = createPool(TEST_DATABASE_URL);
  try {
    await migrate(pool);
  } finally {
    await pool.end();
  }
}
