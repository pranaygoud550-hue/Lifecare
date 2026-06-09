import { setServers } from 'node:dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  atlasConnectionHints,
  encodeMongoUri,
  maskMongoUri,
} from '../src/config/mongoUri.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const rawUri = process.env.MONGODB_URI;
if (!rawUri) {
  console.error('MONGODB_URI is not set in backend/.env');
  process.exit(1);
}

const uri = encodeMongoUri(rawUri);
console.log('Testing:', maskMongoUri(uri));
console.log('Node:', process.version);

if (uri.startsWith('mongodb+srv')) {
  setServers(['8.8.8.8', '1.1.1.1']);
}

try {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
    family: 4,
    autoSelectFamily: false,
  });
  await mongoose.connection.db?.admin().ping();
  console.log('✅ Connected to', mongoose.connection.name);
  process.exit(0);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('❌ Connection failed');
  console.error(message.split('\n')[0]);
  const hints = atlasConnectionHints(message);
  if (hints.length) {
    console.error('\nTry:');
    for (const hint of hints) console.error(`  • ${hint}`);
  }
  process.exit(1);
} finally {
  await mongoose.disconnect().catch(() => undefined);
}
