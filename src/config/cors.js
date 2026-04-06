import env from './env.js';

const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page', 'X-Total-Pages'],
  maxAge: 86400,
};

export default corsOptions;
