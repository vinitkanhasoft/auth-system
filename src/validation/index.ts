import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { UserRoles } from '@/enums/UserRoles';

// Extend Request interface for file uploads
declare global {
  namespace Express {
    interface Request {
      file?: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
      };
    }
  }
}

// Validation result handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((error: any) => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined,
      })),
    });
    return;
  }
  next();
};

// Auth validations
export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email cannot exceed 255 characters'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .isLength({ max: 128 })
    .withMessage('Password cannot exceed 128 characters'),

  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required'),
];

export const passwordResetRequestValidation = [
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
];

export const passwordResetValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 32, max: 64 })
    .withMessage('Invalid reset token format'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .isLength({ max: 128 })
    .withMessage('Password cannot exceed 128 characters'),
];

export const emailVerificationValidation = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isLength({ min: 32, max: 64 })
    .withMessage('Invalid verification token format'),
];

// User management validations
export const updateUserValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email cannot exceed 255 characters'),

  body('role').optional().isIn(Object.values(UserRoles)).withMessage('Invalid user role'),
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .isLength({ max: 128 })
    .withMessage('Password cannot exceed 128 characters'),
];

// ID parameter validation
export const mongoIdValidation = [param('id').isMongoId().withMessage('Invalid ID format')];

export const userIdValidation = [param('userId').isMongoId().withMessage('Invalid user ID format')];

// Query parameter validations
export const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'email', 'firstName', 'lastName', 'role'])
    .withMessage('Invalid sort field'),

  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
];

export const userSearchValidation = [
  ...paginationValidation,

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),

  query('role').optional().isIn(Object.values(UserRoles)).withMessage('Invalid user role'),

  query('isEmailVerified')
    .optional()
    .isBoolean()
    .withMessage('isEmailVerified must be a boolean')
    .toBoolean(),
];

// Token validations
export const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isLength({ min: 32 })
    .withMessage('Invalid refresh token format'),
];

export const revokeTokenValidation = [
  body('tokenId').isMongoId().withMessage('Invalid token ID format'),
];

// Admin validations
export const adminRoleUpdateValidation = [
  body('role').isIn(Object.values(UserRoles)).withMessage('Invalid user role'),

  body('reason')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),
];

// Email validations
export const sendEmailValidation = [
  body('to')
    .isArray()
    .withMessage('Recipients must be an array')
    .custom((recipients: any[]) => {
      if (!Array.isArray(recipients) || recipients.length === 0) {
        throw new Error('At least one recipient is required');
      }
      for (const recipient of recipients) {
        if (
          typeof recipient !== 'string' ||
          !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(recipient)
        ) {
          throw new Error(`Invalid email address: ${recipient}`);
        }
      }
      return true;
    }),

  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject must be between 1 and 200 characters'),

  body('text')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Text content cannot exceed 10000 characters'),

  body('html')
    .optional()
    .trim()
    .isLength({ max: 50000 })
    .withMessage('HTML content cannot exceed 50000 characters')
    .custom((value: any, { req }: any) => {
      if (!value && !req.body.text) {
        throw new Error('Either text or HTML content is required');
      }
      return true;
    }),
];

// Rate limiting validations
export const rateLimitConfigValidation = [
  body('windowMs')
    .isInt({ min: 1000, max: 3600000 })
    .withMessage('Window time must be between 1 second and 1 hour')
    .toInt(),

  body('max')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max requests must be between 1 and 10000')
    .toInt(),

  body('message')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Message must be between 1 and 200 characters'),
];

// Health check and system validations
export const healthCheckValidation = [
  query('detailed')
    .optional()
    .isBoolean()
    .withMessage('Detailed flag must be a boolean')
    .toBoolean(),
];

// Custom validation helpers
export const validateFileUpload = (allowedTypes: string[], maxSize: number = 5 * 1024 * 1024) => [
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        error: 'FILE_REQUIRED',
      });
    }

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File type ${req.file.mimetype} is not allowed`,
        error: 'INVALID_FILE_TYPE',
        allowedTypes,
      });
    }

    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`,
        error: 'FILE_TOO_LARGE',
        maxSize,
      });
    }

    next();
  },
];

// Validation chains for common use cases
export const commonValidations = {
  id: mongoIdValidation,
  userId: userIdValidation,
  pagination: paginationValidation,
  userSearch: userSearchValidation,
  auth: {
    register: registerValidation,
    login: loginValidation,
    passwordReset: passwordResetValidation,
    passwordResetRequest: passwordResetRequestValidation,
    emailVerification: emailVerificationValidation,
    refreshToken: refreshTokenValidation,
  },
  user: {
    update: updateUserValidation,
    changePassword: changePasswordValidation,
    adminRoleUpdate: adminRoleUpdateValidation,
  },
  admin: {
    sendEmail: sendEmailValidation,
    rateLimit: rateLimitConfigValidation,
  },
};

// Export all individual validators for custom combinations
export { body, param, query };
