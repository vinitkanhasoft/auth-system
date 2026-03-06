import mongoose from 'mongoose';
import { logger } from '../utils/logger';

// Database configuration interface
export interface DatabaseConfig {
  protocol: string;
  username?: string;
  password?: string;
  host: string;
  port: number;
  database: string;
  options?: string;
}

// Parse MongoDB URI into components
const parseMongoUri = (uri: string): DatabaseConfig => {
  try {
    const url = new URL(uri);
    return {
      protocol: url.protocol.replace(':', ''),
      username: url.username || undefined,
      password: url.password || undefined,
      host: url.hostname,
      port: parseInt(url.port) || 27017,
      database: url.pathname.substring(1),
      options: url.search || undefined,
    };
  } catch (error) {
    logger.warn('Failed to parse MongoDB URI, using defaults:', error);
    return {
      protocol: 'mongodb',
      host: 'localhost',
      port: 27017,
      database: 'auth-system',
    };
  }
};

// Build MongoDB URI from components
const buildMongoUri = (config: DatabaseConfig): string => {
  const { protocol, username, password, host, port, database, options } = config;

  let uri = `${protocol}://`;

  if (username && password) {
    uri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  } else if (username) {
    uri += `${encodeURIComponent(username)}@`;
  }

  uri += `${host}:${port}/${database}`;

  if (options) {
    uri += options;
  }

  return uri;
};

// Get database configuration from environment variables
const getDatabaseConfig = (): DatabaseConfig => {
  // If MONGODB_URI is provided, parse it
  if (process.env.MONGODB_URI) {
    return parseMongoUri(process.env.MONGODB_URI);
  }

  // Otherwise, build from individual environment variables
  return {
    protocol: process.env.MONGODB_PROTOCOL || 'mongodb',
    username: process.env.MONGODB_USERNAME,
    password: process.env.MONGODB_PASSWORD,
    host: process.env.MONGODB_HOST || 'localhost',
    port: parseInt(process.env.MONGODB_PORT || '27017'),
    database: process.env.MONGODB_DATABASE || 'auth-system',
    options: process.env.MONGODB_OPTIONS,
  };
};

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;
  private config: DatabaseConfig;
  private uri: string;

  private constructor() {
    this.config = getDatabaseConfig();
    this.uri = buildMongoUri(this.config);

    logger.info('Database configuration:', {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      hasAuth: !!(this.config.username && this.config.password),
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Database already connected');
      return;
    }

    try {
      await mongoose.connect(this.uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });

      this.isConnected = true;
      logger.info('Connected to MongoDB successfully');

      mongoose.connection.on('error', error => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      this.isConnected = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  public getUri(): string {
    return this.uri;
  }

  public async testConnection(): Promise<{
    success: boolean;
    message: string;
    config?: DatabaseConfig;
  }> {
    try {
      const state = mongoose.connection.readyState;
      if (state === 1) {
        return {
          success: true,
          message: 'Database connection is active',
          config: this.getConfig(),
        };
      }

      // Try to connect temporarily for testing
      await mongoose.connect(this.uri, {
        serverSelectionTimeoutMS: 3000,
        bufferCommands: false,
      });

      await mongoose.disconnect();

      return {
        success: true,
        message: 'Database connection test successful',
        config: this.getConfig(),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        config: this.getConfig(),
      };
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const state = mongoose.connection.readyState;
      return state === 1; // 1 means connected
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}

export const database = DatabaseConnection.getInstance();
