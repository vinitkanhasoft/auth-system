import { Request, Response, NextFunction } from 'express';
import { JwtUtils } from '../utils/jwt';
import { TokenTypes } from '../enums/TokenTypes';
import { IAuthRequest, IJwtPayload } from '../types';
import { logger } from '../utils/logger';

export const authenticate = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
        error: 'MISSING_TOKEN',
      });
      return;
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
        error: 'MISSING_TOKEN',
      });
      return;
    }

    let decoded: IJwtPayload;
    try {
      decoded = JwtUtils.verifyAccessToken(token);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token verification failed';

      logger.warn(`Authentication failed: ${errorMessage}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        token: token.substring(0, 10) + '...',
      });

      if (errorMessage === 'Token has expired') {
        res.status(401).json({
          success: false,
          message: 'Access token has expired',
          error: 'TOKEN_EXPIRED',
        });
        return;
      }

      res.status(401).json({
        success: false,
        message: 'Invalid access token',
        error: 'INVALID_TOKEN',
      });
      return;
    }

    // Attach user info to request
    req.user = {
      _id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      firstName: '', // These will be populated from database if needed
      lastName: '',
      isEmailVerified: false,
    };

    logger.debug('User authenticated successfully', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      ip: req.ip,
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: 'INTERNAL_ERROR',
    });
  }
};

export const optionalAuth = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      return next();
    }

    try {
      const decoded = JwtUtils.verifyAccessToken(token);

      req.user = {
        _id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        firstName: '',
        lastName: '',
        isEmailVerified: false,
      };

      logger.debug('Optional authentication successful', {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      });
    } catch (error) {
      // For optional auth, we don't return errors, just continue without user
      logger.debug('Optional authentication failed, continuing without user', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next(); // Continue without user for optional auth
  }
};

export const validateToken = (tokenType: TokenTypes) => {
  return (req: IAuthRequest, res: Response, next: NextFunction): void => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          message: `${tokenType.replace('_', ' ')} token is required`,
          error: 'MISSING_TOKEN',
        });
        return;
      }

      let decoded: IJwtPayload;
      try {
        switch (tokenType) {
          case TokenTypes.PASSWORD_RESET:
            decoded = JwtUtils.verifyPasswordResetToken(token);
            break;
          case TokenTypes.EMAIL_VERIFICATION:
            decoded = JwtUtils.verifyEmailVerificationToken(token);
            break;
          case TokenTypes.REFRESH_TOKEN:
            decoded = JwtUtils.verifyRefreshToken(token);
            break;
          default:
            res.status(400).json({
              success: false,
              message: 'Invalid token type',
              error: 'INVALID_TOKEN_TYPE',
            });
            return;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Token verification failed';

        if (errorMessage === 'Token has expired') {
          res.status(401).json({
            success: false,
            message: `${tokenType.replace('_', ' ')} token has expired`,
            error: 'TOKEN_EXPIRED',
          });
          return;
        }

        res.status(401).json({
          success: false,
          message: `Invalid ${tokenType.replace('_', ' ')} token`,
          error: 'INVALID_TOKEN',
        });
        return;
      }

      // Attach decoded token to request
      req.tokenData = decoded;
      next();
    } catch (error) {
      logger.error('Token validation middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during token validation',
        error: 'INTERNAL_ERROR',
      });
    }
  };
};

// Extend the Request interface to include tokenData
declare global {
  namespace Express {
    interface Request {
      tokenData?: IJwtPayload;
    }
  }
}
