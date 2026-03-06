import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { database } from './config/database';
import { redis } from './config/redis';
import { logger } from './utils/logger';
import { startTokenCleanupJob } from './utils/tokenCleanup';
import routes from './routes';
import { apiRateLimit } from './middleware/rateLimiter';
import { getSystemInfo, getContactInfo } from './constants/systemInfo';
import { createErrorResponse, API_RESPONSES } from './constants/apiResponses';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.info(message.trim());
        },
      },
    })
  );
}

// Rate limiting
app.use('/api', apiRateLimit);

// Health check endpoint (before routes)
app.get('/health', (req, res) => {
  const systemInfo = getSystemInfo();
  res.status(200).json({
    success: true,
    message: 'Server is running',
    ...systemInfo,
    contact: getContactInfo(),
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use('*', (req, res) => {
  res
    .status(404)
    .json(
      createErrorResponse(API_RESPONSES.ERROR.NOT_FOUND, API_RESPONSES.ERROR_CODES.NOT_FOUND, 404)
    );
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res
    .status(error.statusCode || 500)
    .json(
      createErrorResponse(
        isDevelopment ? error.message : API_RESPONSES.ERROR.INTERNAL_ERROR,
        isDevelopment
          ? error.name || API_RESPONSES.ERROR_CODES.INTERNAL_ERROR
          : API_RESPONSES.ERROR_CODES.INTERNAL_ERROR,
        error.statusCode || 500
      )
    );
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close database connections
    await database.disconnect();
    logger.info('Database connections closed');

    // Close Redis connection
    await redis.disconnect();
    logger.info('Redis connection closed');

    // Close logger
    logger.close();

    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
const startServer = async () => {
  try {
    // Initialize database connection
    await database.connect();
    logger.info('Database connected successfully');

    // Initialize Redis connection
    await redis.connect();
    logger.info('Redis connected successfully');

    // Start token cleanup job
    startTokenCleanupJob();
    logger.info('Token cleanup job started');

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(
        `Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`
      );
      logger.info(`Health check available at: http://localhost:${PORT}/health`);
      logger.info(`API documentation available at: http://localhost:${PORT}/api`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
