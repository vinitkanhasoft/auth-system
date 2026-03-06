import { Response, NextFunction } from 'express';
import { IAuthRequest } from '../types';
import { UserRoles, RoleHierarchy } from '../enums/UserRoles';
import { logger } from '../utils/logger';

export const requireRole = (minimumRole: UserRoles) => {
  return (req: IAuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user || !req.user.role) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const userRole = req.user.role as UserRoles;
      const userRoleLevel = RoleHierarchy[userRole];
      const requiredRoleLevel = RoleHierarchy[minimumRole];

      if (userRoleLevel < requiredRoleLevel) {
        logger.warn('Access denied: Insufficient privileges', {
          userId: req.user._id,
          userRole,
          requiredRole: minimumRole,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });

        res.status(403).json({
          success: false,
          message: 'Insufficient privileges to access this resource',
          error: 'INSUFFICIENT_PRIVILEGES',
          required: minimumRole,
          current: userRole,
        });
        return;
      }

      logger.debug('Role-based access check passed', {
        userId: req.user._id,
        userRole,
        requiredRole: minimumRole,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Role-based access control error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during authorization',
        error: 'INTERNAL_ERROR',
      });
    }
  };
};

export const requireAdmin = requireRole(UserRoles.ADMIN);
export const requireModerator = requireRole(UserRoles.MODERATOR);
export const requireUser = requireRole(UserRoles.USER);

export const requireExactRole = (requiredRole: UserRoles) => {
  return (req: IAuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user || !req.user.role) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const userRole = req.user.role as UserRoles;

      if (userRole !== requiredRole) {
        logger.warn('Access denied: Role mismatch', {
          userId: req.user._id,
          userRole,
          requiredRole,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });

        res.status(403).json({
          success: false,
          message: `Access restricted to ${requiredRole} role only`,
          error: 'ROLE_MISMATCH',
          required: requiredRole,
          current: userRole,
        });
        return;
      }

      logger.debug('Exact role access check passed', {
        userId: req.user._id,
        userRole,
        requiredRole,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Exact role access control error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during authorization',
        error: 'INTERNAL_ERROR',
      });
    }
  };
};

export const requireAnyRole = (allowedRoles: UserRoles[]) => {
  return (req: IAuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user || !req.user.role) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const userRole = req.user.role as UserRoles;

      if (!allowedRoles.includes(userRole)) {
        logger.warn('Access denied: Role not allowed', {
          userId: req.user._id,
          userRole,
          allowedRoles,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });

        res.status(403).json({
          success: false,
          message: 'Access denied: Your role is not authorized for this resource',
          error: 'ROLE_NOT_ALLOWED',
          allowed: allowedRoles,
          current: userRole,
        });
        return;
      }

      logger.debug('Multi-role access check passed', {
        userId: req.user._id,
        userRole,
        allowedRoles,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Multi-role access control error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during authorization',
        error: 'INTERNAL_ERROR',
      });
    }
  };
};

export const requireEmailVerification = (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED',
      });
      return;
    }

    if (!req.user.isEmailVerified) {
      logger.warn('Access denied: Email not verified', {
        userId: req.user._id,
        email: req.user.email,
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      res.status(403).json({
        success: false,
        message: 'Email verification required to access this resource',
        error: 'EMAIL_NOT_VERIFIED',
      });
      return;
    }

    logger.debug('Email verification check passed', {
      userId: req.user._id,
      email: req.user.email,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error('Email verification check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during email verification check',
      error: 'INTERNAL_ERROR',
    });
  }
};

export const checkOwnership = (resourceUserIdField = 'userId') => {
  return (req: IAuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user || !req.user._id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      // Check if user is admin (admins can access any resource)
      if (req.user.role === UserRoles.ADMIN) {
        return next();
      }

      // Get the resource user ID from the request
      const resourceUserId =
        req.params[resourceUserIdField] ||
        req.body[resourceUserIdField] ||
        req.query[resourceUserIdField];

      if (!resourceUserId) {
        res.status(400).json({
          success: false,
          message: 'Resource user ID not found',
          error: 'RESOURCE_USER_ID_MISSING',
        });
        return;
      }

      if (req.user._id.toString() !== resourceUserId.toString()) {
        logger.warn('Access denied: Resource ownership check failed', {
          userId: req.user._id,
          resourceUserId,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });

        res.status(403).json({
          success: false,
          message: 'Access denied: You can only access your own resources',
          error: 'RESOURCE_OWNERSHIP_REQUIRED',
        });
        return;
      }

      logger.debug('Resource ownership check passed', {
        userId: req.user._id,
        resourceUserId,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Resource ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during ownership verification',
        error: 'INTERNAL_ERROR',
      });
    }
  };
};
