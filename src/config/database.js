import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import env from './env.js';

const MONGO_OPTIONS = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
};

let isConnected = false;

const connect = async () => {
  if (isConnected) return;

  try {
    const uri = env.NODE_ENV === 'test' ? env.MONGODB_URI_TEST : env.MONGODB_URI;
    await mongoose.connect(uri, MONGO_OPTIONS);
    isConnected = true;
    logger.info({ uri: uri.replace(/\/\/.*@/, '//***@') }, '✅ MongoDB connected');
  } catch (err) {
    logger.error({ err }, '❌ MongoDB connection failed');
    process.exit(1);
  }
};

const disconnect = async () => {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('MongoDB disconnected');
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected — attempting reconnect...');
  isConnected = false;
  setTimeout(connect, 5000);
});

mongoose.connection.on('error', (err) => {
  logger.error({ err }, 'MongoDB connection error');
});

export { connect, disconnect };
