import { Response } from 'express';
import { database } from '../config/database';
import {
  getDatabaseConfig,
  getDatabaseStatus,
  testDatabaseConnection,
} from '../utils/databaseUtils';
import { logger } from '../utils/logger';

/**
 * Health check controller with detailed database information
 */

export const healthCheck = async (req: any, res: Response) => {
  try {
    const dbStatus = getDatabaseStatus();
    const dbHealth = await database.healthCheck();

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: dbHealth,
        config: {
          host: dbStatus.config.host,
          port: dbStatus.config.port,
          database: dbStatus.config.database,
          protocol: dbStatus.config.protocol,
          hasAuth: !!(dbStatus.config.username && dbStatus.config.password),
        },
        connectionStatus: dbStatus.isConnected ? 'connected' : 'disconnected',
      },
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      },
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const detailedHealthCheck = async (req: any, res: Response) => {
  try {
    const dbStatus = getDatabaseStatus();
    const dbTest = await testDatabaseConnection();

    const detailed = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        test: dbTest,
        config: dbStatus.config,
        uri: dbStatus.uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'), // Hide credentials
        connectionStatus: dbStatus.isConnected ? 'connected' : 'disconnected',
        mongooseState: database.getConnectionStatus(),
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
      memory: {
        rss: Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100,
        heapTotal: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        heapUsed: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        external: Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100,
      },
    };

    res.status(200).json(detailed);
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const databaseInfo = async (req: any, res: Response) => {
  try {
    const config = getDatabaseConfig();
    const test = await testDatabaseConnection();

    const info = {
      configuration: config,
      test,
      examples: {
        development: {
          MONGODB_PROTOCOL: 'mongodb',
          MONGODB_HOST: 'localhost',
          MONGODB_PORT: '27017',
          MONGODB_DATABASE: 'auth-system',
        },
        production: {
          MONGODB_PROTOCOL: 'mongodb+srv',
          MONGODB_HOST: 'cluster0.abcde.mongodb.net',
          MONGODB_PORT: '27017',
          MONGODB_DATABASE: 'auth-system',
          MONGODB_USERNAME: 'your-username',
          MONGODB_PASSWORD: 'your-password',
        },
      },
    };

    res.status(200).json(info);
  } catch (error) {
    logger.error('Database info failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
