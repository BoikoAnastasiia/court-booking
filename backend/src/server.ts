import { createApp } from './app';
import { config } from './config';
import { createPool } from './db/pool';

const db = createPool();
const app = createApp({ db });

const server = app.listen(config.port, () => {
  console.log(`API listening on :${config.port} (facility timezone ${config.facilityTimezone})`);
});

function shutdown() {
  server.close(() => {
    db.end().finally(() => process.exit(0));
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
