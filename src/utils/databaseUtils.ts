import { database } from '../config/database';
import { DatabaseConfig } from '../config/database';

/**
 * Database utility functions for testing and configuration management
 */

/**
 * Get current database configuration
 */
export const getDatabaseConfig = (): DatabaseConfig => {
  return database.getConfig();
};

/**
 * Get the constructed MongoDB URI
 */
export const getDatabaseUri = (): string => {
  return database.getUri();
};

/**
 * Test database connection
 */
export const testDatabaseConnection = async () => {
  return await database.testConnection();
};

/**
 * Build MongoDB URI from components
 */
export const buildMongoUri = (config: Partial<DatabaseConfig>): string => {
  const defaultConfig: DatabaseConfig = {
    protocol: 'mongodb',
    host: 'localhost',
    port: 27017,
    database: 'auth-system',
  };

  const finalConfig = { ...defaultConfig, ...config };

  let uri = `${finalConfig.protocol}://`;

  if (finalConfig.username && finalConfig.password) {
    uri += `${encodeURIComponent(finalConfig.username)}:${encodeURIComponent(finalConfig.password)}@`;
  } else if (finalConfig.username) {
    uri += `${encodeURIComponent(finalConfig.username)}@`;
  }

  uri += `${finalConfig.host}:${finalConfig.port}/${finalConfig.database}`;

  if (finalConfig.options) {
    uri += finalConfig.options;
  }

  return uri;
};

/**
 * Parse MongoDB URI into components
 */
export const parseMongoUri = (uri: string): DatabaseConfig => {
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
    throw new Error(`Invalid MongoDB URI: ${uri}`);
  }
};

/**
 * Validate database configuration
 */
export const validateDatabaseConfig = (
  config: Partial<DatabaseConfig>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.host) {
    errors.push('Database host is required');
  }

  if (config.port && (config.port < 1 || config.port > 65535)) {
    errors.push('Database port must be between 1 and 65535');
  }

  if (!config.database) {
    errors.push('Database name is required');
  }

  if (config.database && !/^[a-zA-Z0-9_-]+$/.test(config.database)) {
    errors.push('Database name can only contain letters, numbers, underscores, and hyphens');
  }

  if (config.protocol && !['mongodb', 'mongodb+srv'].includes(config.protocol)) {
    errors.push('Protocol must be either "mongodb" or "mongodb+srv"');
  }

  if (config.username && !config.password) {
    errors.push('Password is required when username is provided');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get database connection status
 */
export const getDatabaseStatus = () => {
  return {
    isConnected: database.getConnectionStatus(),
    config: database.getConfig(),
    uri: database.getUri(),
  };
};

/**
 * Environment-specific database configurations
 */
export const getEnvironmentDatabaseConfig = (): DatabaseConfig => {
  const env = process.env.NODE_ENV || 'development';

  const baseConfig = {
    protocol: process.env.MONGODB_PROTOCOL || 'mongodb',
    username: process.env.MONGODB_USERNAME,
    password: process.env.MONGODB_PASSWORD,
    host: process.env.MONGODB_HOST || 'localhost',
    port: parseInt(process.env.MONGODB_PORT || '27017'),
    database: process.env.MONGODB_DATABASE || 'auth-system',
    options: process.env.MONGODB_OPTIONS,
  };

  // Environment-specific overrides
  switch (env) {
    case 'test':
      return {
        ...baseConfig,
        database: process.env.MONGODB_TEST_DATABASE || 'auth-system-test',
      };
    case 'production':
      return {
        ...baseConfig,
        protocol: process.env.MONGODB_PROTOCOL || 'mongodb+srv', // Prefer SRV in production
        options: process.env.MONGODB_OPTIONS || '?retryWrites=true&w=majority',
      };
    default:
      return baseConfig;
  }
};

/**
 * Database configuration examples for different environments
 */
export const databaseConfigExamples = {
  development: {
    MONGODB_PROTOCOL: 'mongodb',
    MONGODB_HOST: 'localhost',
    MONGODB_PORT: '27017',
    MONGODB_DATABASE: 'auth-system',
    MONGODB_USERNAME: '',
    MONGODB_PASSWORD: '',
    MONGODB_OPTIONS: '',
  },
  production: {
    MONGODB_PROTOCOL: 'mongodb+srv',
    MONGODB_HOST: 'cluster0.abcde.mongodb.net',
    MONGODB_PORT: '27017',
    MONGODB_DATABASE: 'auth-system',
    MONGODB_USERNAME: 'your-username',
    MONGODB_PASSWORD: 'your-password',
    MONGODB_OPTIONS: '?retryWrites=true&w=majority',
  },
  test: {
    MONGODB_PROTOCOL: 'mongodb',
    MONGODB_HOST: 'localhost',
    MONGODB_PORT: '27017',
    MONGODB_DATABASE: 'auth-system-test',
    MONGODB_USERNAME: '',
    MONGODB_PASSWORD: '',
    MONGODB_OPTIONS: '',
  },
};
