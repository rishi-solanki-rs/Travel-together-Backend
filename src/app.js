import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import env from './config/env.js';
import corsOptions from './config/cors.js';
import swaggerSpec from './config/swagger.js';
import { defaultLimiter } from './config/rateLimiter.js';
import requestLogger from './middlewares/requestLogger.js';
import correlationIdMiddleware from './middlewares/correlationId.js';
import observabilityMiddleware from './middlewares/observability.js';
import runtimeAbuseGuard from './middlewares/runtimeAbuseGuard.js';
import errorHandler from './middlewares/errorHandler.js';
import notFound from './middlewares/notFound.js';
import registerRoutes from './bootstrap/registerRoutes.js';
import internalRoutes from './modules/internal/internal.routes.js';

const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(correlationIdMiddleware);
  app.use(observabilityMiddleware);
  app.use(runtimeAbuseGuard);

  if (env.NODE_ENV !== 'test') {
    app.use(requestLogger);
  }

  app.use(defaultLimiter);

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      service: env.APP_NAME,
      version: env.API_VERSION,
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  app.use(
    `/api/${env.API_VERSION}/docs`,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Together In India API Docs',
      customCss: '.swagger-ui .topbar { background: #1a1a2e; }',
      explorer: true,
    })
  );

  app.use('/internal', internalRoutes);

  registerRoutes(app);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;
