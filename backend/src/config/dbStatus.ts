import mongoose from 'mongoose';
import { isDatabaseConnected } from './database.js';

export const isDbReady = (): boolean =>
  isDatabaseConnected && mongoose.connection.readyState === 1;
