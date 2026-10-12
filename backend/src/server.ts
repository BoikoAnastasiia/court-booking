import { createApp } from './app';
import { config } from './config';
import { createPool } from './db/pool';
import { RealtimeHub } from './realtime/hub';
import { attachRealtime } from './realtime/websocket';

const db = createPool();
const hub = new RealtimeHub();
const app = createApp({ db, realtime: hub });

const server = app.listen(config.port, () => {
  console.log(`API listening on :${config.port} (facility timezone ${config.facilityTimezone})`);
});
const realtime = attachRealtime(server, hub);

function shutdown() {
  realtime.close();
  server.close(() => {
    db.end().finally(() => process.exit(0));
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
