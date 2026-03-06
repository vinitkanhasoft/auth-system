import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { IRateLimitInfo } from '../types';

export class RateLimiter {
  private keyPrefix: string;
  private windowMs: number;
  private maxRequests: number;
  private skipSuccessfulRequests: boolean;
  private skipFailedRequests: boolean;

  constructor(options: {
    keyPrefix: string;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  }) {
    this.keyPrefix = options.keyPrefix;
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;
  }

  private getKey(req: Request): string {
    // Use IP address as the key, but you can customize this
    const identifier = req.ip || req.connection.remoteAddress || 'unknown';
    return `${this.keyPrefix}:${identifier}`;
  }

  private async getRateLimitInfo(key: string): Promise<{
    current: number;
    ttl: number;
  }> {
    try {
      const current = await redis.get(key);
      const ttl = await redis.getClient().ttl(key);

      return {
        current: current ? parseInt(current, 10) : 0,
        ttl: ttl > 0 ? ttl : Math.ceil(this.windowMs / 1000),
      };
    } catch (error) {
      logger.error('Error getting rate limit info:', error);
      return { current: 0, ttl: 0 };
    }
  }

  private async incrementCounter(key: string): Promise<number> {
    try {
      const result = await redis.getClient().incr(key);

      // Set expiration only on first increment
      if (result === 1) {
        await redis.expire(key, Math.ceil(this.windowMs / 1000));
      }

      return result;
    } catch (error) {
      logger.error('Error incrementing rate limit counter:', error);
      return 0;
    }
  }

  public middleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = this.getKey(req);
      const current = await this.incrementCounter(key);

      const rateLimitInfo: IRateLimitInfo = {
        windowMs: this.windowMs,
        max: this.maxRequests,
        message: `Too many requests. Please try again later.`,
        standardHeaders: true,
        legacyHeaders: false,
      };

      // Set rate limit headers
      const ttl = await redis.getClient().ttl(key);
      const resetTime = Date.now() + ttl * 1000;

      res.set({
        'X-RateLimit-Limit': this.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, this.maxRequests - current).toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString(),
      });

      if (current > this.maxRequests) {
        logger.warn('Rate limit exceeded', {
          key,
          current,
          max: this.maxRequests,
          ip: req.ip,
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
        });

        res.status(429).json({
          success: false,
          message: rateLimitInfo.message,
          error: 'RATE_LIMIT_EXCEEDED',
          retryAfter: ttl,
        });
        return;
      }

      // Store the original res.end to track successful/failed requests
      const originalEnd = res.end;
      let requestCompleted = false;
      const skipSuccessful = this.skipSuccessfulRequests;
      const skipFailed = this.skipFailedRequests;

      res.end = function (chunk?: any, encoding?: any) {
        if (!requestCompleted) {
          requestCompleted = true;

          // Decrement counter if configured to skip successful requests and response is successful
          if (skipSuccessful && res.statusCode >= 200 && res.statusCode < 300) {
            redis.decrement(key).catch(error => {
              logger.error('Error decrementing rate limit counter for successful request:', error);
            });
          }

          // Decrement counter if configured to skip failed requests and response is an error
          if (skipFailed && res.statusCode >= 400) {
            redis.decrement(key).catch(error => {
              logger.error('Error decrementing rate limit counter for failed request:', error);
            });
          }
        }

        return originalEnd.call(this, chunk, encoding);
      };

      logger.debug('Rate limit check passed', {
        key,
        current,
        max: this.maxRequests,
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Rate limiter middleware error:', error);
      // Continue without rate limiting if Redis fails
      next();
    }
  };
}

// Predefined rate limiters for common use cases
export const createAuthRateLimiter = () =>
  new RateLimiter({
    keyPrefix: 'auth',
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    skipFailedRequests: false,
  });

export const createLoginRateLimiter = () =>
  new RateLimiter({
    keyPrefix: 'login',
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
    skipFailedRequests: false,
  });

export const createPasswordResetRateLimiter = () =>
  new RateLimiter({
    keyPrefix: 'password_reset',
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 password reset requests per hour
    skipFailedRequests: false,
  });

export const createRegistrationRateLimiter = () =>
  new RateLimiter({
    keyPrefix: 'registration',
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 registrations per hour
    skipFailedRequests: false,
  });

export const createEmailVerificationRateLimiter = () =>
  new RateLimiter({
    keyPrefix: 'email_verification',
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 verification attempts per hour
    skipFailedRequests: false,
  });

export const createApiRateLimiter = () =>
  new RateLimiter({
    keyPrefix: 'api',
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes
    skipSuccessfulRequests: false,
  });

// Middleware instances
export const authRateLimit = createAuthRateLimiter().middleware;
export const loginRateLimit = createLoginRateLimiter().middleware;
export const passwordResetRateLimit = createPasswordResetRateLimiter().middleware;
export const registrationRateLimit = createRegistrationRateLimiter().middleware;
export const emailVerificationRateLimit = createEmailVerificationRateLimiter().middleware;
export const apiRateLimit = createApiRateLimiter().middleware;

// User-specific rate limiter (for authenticated users)
export const createUserRateLimiter = (maxRequests: number, windowMs: number) => {
  return new RateLimiter({
    keyPrefix: 'user',
    windowMs,
    maxRequests,
    skipSuccessfulRequests: false,
  });
};

// Role-based rate limiter
export const createRoleBasedRateLimiter = (
  roleLimits: Record<string, { max: number; windowMs: number }>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;

    if (!user || !user.role) {
      // Use default rate limiter for unauthenticated requests
      return await authRateLimit(req, res, next);
    }

    const roleLimit = roleLimits[user.role];
    if (!roleLimit) {
      // Use default rate limiter if role not specified
      return await authRateLimit(req, res, next);
    }

    const limiter = new RateLimiter({
      keyPrefix: `role_${user.role}`,
      windowMs: roleLimit.windowMs,
      maxRequests: roleLimit.max,
      skipSuccessfulRequests: false,
    });

    await limiter.middleware(req, res, next);
  };
};
