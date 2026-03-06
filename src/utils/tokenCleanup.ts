import User from '../models/User';
import { logger } from './logger';

/**
 * Cleanup expired tokens from all users
 * This should be run periodically to prevent document bloat
 */
export const cleanupExpiredTokens = async (): Promise<void> => {
  try {
    const result = await User.updateMany(
      {},
      { 
        $pull: { 
          tokens: { 
            $or: [
              { expiresAt: { $lt: new Date() } }, // Expired tokens
              { isRevoked: true, expiresAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Revoked tokens older than 24 hours
            ]
          } 
        } 
      }
    );

    logger.info('Token cleanup completed', {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    });
  } catch (error) {
    logger.error('Token cleanup failed:', error);
  }
};

/**
 * Cleanup job to be run periodically
 * Recommended: Run every hour via cron job or scheduler
 */
export const startTokenCleanupJob = (): void => {
  // Run cleanup every hour
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
  
  // Run initial cleanup
  cleanupExpiredTokens();
  
  logger.info('Token cleanup job started - runs every hour');
};
