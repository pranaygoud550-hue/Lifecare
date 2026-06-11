import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { initSocket } from './services/socketService.js';

async function start() {
  await mongoose.connect(env.mongoUri);
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.port, () => {
    console.log(`RapidCare API listening on :${env.port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
