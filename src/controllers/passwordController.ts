import { Response, NextFunction } from 'express';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { JwtUtils } from '../utils/jwt';
import { TokenTypes } from '../enums/TokenTypes';
import { IAuthRequest, IPasswordResetRequest, IPasswordReset } from '../types';
import { logger } from '../utils/logger';
import { emailService } from '../services/emailService';
import {
  API_RESPONSES,
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
} from '../constants/apiResponses';

// Validation schemas
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required',
  }),
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required',
    }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Password confirmation is required',
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required',
    }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Password confirmation is required',
  }),
});

export class PasswordController {
  public static forgotPassword = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { error, value } = forgotPasswordSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: 'VALIDATION_ERROR',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
        return;
      }

      const { email }: IPasswordResetRequest = value;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal that user doesn't exist for security
        res.status(200).json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
        });
        return;
      }

      // Generate password reset token
      const passwordResetToken = JwtUtils.generatePasswordResetToken(
        user._id.toString(),
        user.email,
        user.role
      );

      // Add token to user's tokens array
      await user.addToken(
        passwordResetToken,
        TokenTypes.PASSWORD_RESET,
        JwtUtils.getTokenExpirationDate(passwordResetToken) || new Date(Date.now() + 60 * 60 * 1000)
      );

      // Update user with reset token
      user.passwordResetToken = passwordResetToken;
      user.passwordResetExpires =
        JwtUtils.getTokenExpirationDate(passwordResetToken) ||
        new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail(user.email, passwordResetToken);
      } catch (emailError) {
        logger.error('Failed to send password reset email:', emailError);
      }

      logger.info('Password reset requested', {
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      next(error);
    }
  };

  public static resetPassword = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { error, value } = resetPasswordSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: 'VALIDATION_ERROR',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
        return;
      }

      const { token, newPassword }: IPasswordReset = value;

      // Verify token
      let decoded;
      try {
        decoded = JwtUtils.verifyPasswordResetToken(token);
      } catch (tokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired reset token',
          error: 'INVALID_TOKEN',
        });
        return;
      }

      // Check if token exists in user's tokens array and is not revoked
      const user = await User.findOne({
        'tokens.token': token,
        'tokens.type': TokenTypes.PASSWORD_RESET,
        'tokens.isRevoked': false,
        'tokens.expiresAt': { $gt: new Date() },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired reset token',
          error: 'INVALID_TOKEN',
        });
        return;
      }

      // Update password
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      // Revoke the used password reset token
      await user.revokeToken(token);

      // Revoke all refresh tokens for this user
      await user.revokeAllTokens(TokenTypes.REFRESH_TOKEN);

      // Send password changed notification
      try {
        await emailService.sendPasswordChangedEmail(user.email);
      } catch (emailError) {
        logger.error('Failed to send password changed email:', emailError);
      }

      logger.info('Password reset successfully', {
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully',
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      next(error);
    }
  };

  public static changePassword = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user || !req.user._id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED',
        });
        return;
      }

      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: 'VALIDATION_ERROR',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
        return;
      }

      const { currentPassword, newPassword } = value;

      // Find user with password
      const user = await User.findById(req.user._id).select('+password');
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        });
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
          error: 'INVALID_CURRENT_PASSWORD',
        });
        return;
      }

      // Check if new password is same as current password
      const isSamePassword = await user.comparePassword(newPassword);
      if (isSamePassword) {
        res.status(400).json({
          success: false,
          message: 'New password must be different from current password',
          error: 'SAME_PASSWORD',
        });
        return;
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Revoke all refresh tokens for this user
      await user.revokeAllTokens(TokenTypes.REFRESH_TOKEN);

      // Send password changed notification
      try {
        await emailService.sendPasswordChangedEmail(user.email);
      } catch (emailError) {
        logger.error('Failed to send password changed email:', emailError);
      }

      logger.info('Password changed successfully', {
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Change password error:', error);
      next(error);
    }
  };

  public static verifyResetToken = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Reset token is required',
          error: 'MISSING_TOKEN',
        });
        return;
      }

      // Verify token
      let decoded;
      try {
        decoded = JwtUtils.verifyPasswordResetToken(token);
      } catch (tokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired reset token',
          error: 'INVALID_TOKEN',
        });
        return;
      }

      // Check if token exists in user's tokens array and is not revoked
      const user = await User.findOne({
        'tokens.token': token,
        'tokens.type': TokenTypes.PASSWORD_RESET,
        'tokens.isRevoked': false,
        'tokens.expiresAt': { $gt: new Date() },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired reset token',
          error: 'INVALID_TOKEN',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Reset token is valid',
        data: {
          email: user.email,
          firstName: user.firstName,
        },
      });
    } catch (error) {
      logger.error('Verify reset token error:', error);
      next(error);
    }
  };
}
