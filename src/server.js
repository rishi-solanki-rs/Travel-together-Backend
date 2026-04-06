import 'dotenv/config';
import createApp from './app.js';
import { connect as connectDB } from './config/database.js';
import { getRedisClient } from './config/redis.js';
import registerJobs from './bootstrap/registerJobs.js';
import logger from './utils/logger.js';
import env from './config/env.js';
import { disconnect } from './config/database.js';

const startServer = async () => {
  try {
    await connectDB();

    getRedisClient().connect().catch(() => {
      logger.warn('Redis unavailable — proceeding without cache layer');
    });

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 ${env.APP_NAME} API running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`📖 Swagger UI: http://localhost:${env.PORT}/api/${env.API_VERSION}/docs`);
      logger.info(`❤️  Health: http://localhost:${env.PORT}/health`);
    });

    registerJobs();

    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        await disconnect();
        logger.info('✅ Graceful shutdown complete');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'Unhandled Promise Rejection');
    });

    process.on('uncaughtException', (err) => {
      logger.fatal({ err }, 'Uncaught Exception — process exiting');
      process.exit(1);
    });

    return server;
  } catch (err) {
    logger.fatal({ err }, '❌ Failed to start server');
    process.exit(1);
  }
};

startServer();
