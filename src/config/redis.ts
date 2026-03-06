import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { IRedisClient } from '../types';

export class RedisConnection implements IRedisClient {
  private static instance: RedisConnection;
  private client: RedisClientType;
  private isConnected: boolean = false;

  private constructor() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        reconnectStrategy: retries => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return false;
          }
          return Math.min(retries * 50, 500);
        },
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    this.client.on('error', error => {
      logger.error('Redis connection error:', error);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
      this.isConnected = true;
    });

    this.client.on('end', () => {
      logger.warn('Redis client disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });
  }

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Redis already connected');
      return;
    }

    try {
      await this.client.connect();
      logger.info('Connected to Redis successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from Redis');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  public async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      throw error;
    }
  }

  public async set(
    key: string,
    value: string,
    mode?: string,
    duration?: number
  ): Promise<string | null> {
    try {
      if (mode && duration) {
        return await this.client.set(key, value, { [mode]: duration });
      }
      return await this.client.set(key, value);
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      throw error;
    }
  }

  public async decrement(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      logger.error(`Redis DECR error for key ${key}:`, error);
      throw error;
    }
  }

  public async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      throw error;
    }
  }

  public async exists(key: string): Promise<number> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      throw error;
    }
  }

  public async expire(key: string, seconds: number): Promise<boolean> {
    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }
}

export const redis = RedisConnection.getInstance();
