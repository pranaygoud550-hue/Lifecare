import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { initializeSocket } from '../../src/services/socketService.js';

export interface TestServer {
  httpServer: Server;
  port: number;
  baseUrl: string;
  close: () => Promise<void>;
}

export async function startTestServer(): Promise<TestServer> {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }

  const app = createApp();
  const httpServer = createServer(app);
  initializeSocket(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, resolve);
  });

  const address = httpServer.address() as AddressInfo;

  return {
    httpServer,
    port: address.port,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}
