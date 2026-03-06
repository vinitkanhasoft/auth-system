import { Response, NextFunction } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import User, { UserDocument } from '../models/User';
import { JwtUtils } from '../utils/jwt';
import { TokenTypes } from '../enums/TokenTypes';
import {
  IAuthRequest,
  IRegisterData,
  ILoginData,
  IAuthResponse,
  IRefreshTokenRequest,
} from '../types';
import { logger } from '../utils/logger';
import { emailService } from '../services/emailService';
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse, API_RESPONSES } from '@/constants';

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters',
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters',
    'any.required': 'Last name is required',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

export class AuthController {
  public static register = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        res.status(400).json(
          createValidationErrorResponse(
            error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
            }))
          )
        );
        return;
      }

      const { email, password, firstName, lastName }: IRegisterData = value;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res
          .status(409)
          .json(
            createErrorResponse(
              API_RESPONSES.ERROR.USER_EXISTS,
              API_RESPONSES.ERROR_CODES.USER_EXISTS,
              409
            )
          );
        return;
      }

      // Create new user
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        isEmailVerified: false,
      });

      await user.save();

      // Generate email verification token
      const emailVerificationToken = JwtUtils.generateEmailVerificationToken(
        user._id.toString(),
        user.email,
        user.role
      );

      // Save email verification token to user's tokens array
      await user.addToken(
        emailVerificationToken,
        TokenTypes.EMAIL_VERIFICATION,
        JwtUtils.getTokenExpirationDate(emailVerificationToken) ||
          new Date(Date.now() + 24 * 60 * 60 * 1000)
      );

      // Send verification email
      try {
        await emailService.sendEmailVerificationEmail(user.email, emailVerificationToken);
      } catch (emailError) {
        logger.error('Failed to send verification email:', emailError);
      }

      logger.info('User registered successfully', {
        userId: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });

      res.status(201).json(
        createSuccessResponse(API_RESPONSES.SUCCESS.REGISTER, {
          user: user.getPublicProfile(),
        })
      );
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  };

  public static login = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        res.status(400).json(
          createValidationErrorResponse(
            error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
            }))
          )
        );
        return;
      }

      const { email, password }: ILoginData = value;

      // Find user with password
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS',
        });
        return;
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS',
        });
        return;
      }

      // Generate tokens
      const accessToken = JwtUtils.generateAccessToken(user._id.toString(), user.email, user.role);

      const refreshToken = JwtUtils.generateRefreshToken(
        user._id.toString(),
        user.email,
        user.role
      );

      // Save refresh token to user's tokens array
      await user.addToken(
        refreshToken,
        TokenTypes.REFRESH_TOKEN,
        JwtUtils.getTokenExpirationDate(refreshToken) ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Revoke all old refresh tokens for this user (except the new one)
      await user.revokeAllTokens(TokenTypes.REFRESH_TOKEN);
      
      // Re-enable the new refresh token (since revokeAllTokens disabled it)
      const newToken = user.tokens?.find(t => t.token === refreshToken);
      if (newToken) {
        newToken.isRevoked = false;
      }
      await user.save();

      const authResponse: IAuthResponse = {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken,
      };

      logger.info('User logged in successfully', {
        userId: user._id,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: authResponse,
      });
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  };

  public static logout = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required for logout',
          error: 'MISSING_REFRESH_TOKEN',
        });
        return;
      }

      // Find user and revoke the refresh token
      const user = await User.findById(req.user?._id);
      if (user) {
        await user.revokeToken(refreshToken);
      }

      logger.info('User logged out successfully', {
        userId: req.user?._id,
        email: req.user?.email,
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  };

  public static refreshToken = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { error, value } = refreshTokenSchema.validate(req.body);
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

      const { refreshToken }: IRefreshTokenRequest = value;

      // Verify refresh token
      let decoded;
      try {
        decoded = JwtUtils.verifyRefreshToken(refreshToken);
      } catch (tokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
          error: 'INVALID_REFRESH_TOKEN',
        });
        return;
      }

      // Check if token exists in user's tokens array and is not revoked
      const user = await User.findOne({
        'tokens.token': refreshToken,
        'tokens.type': TokenTypes.REFRESH_TOKEN,
        'tokens.isRevoked': false,
        'tokens.expiresAt': { $gt: new Date() }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
          error: 'INVALID_REFRESH_TOKEN',
        });
        return;
      }

      // Generate new access token
      const newAccessToken = JwtUtils.generateAccessToken(
        user._id?.toString() || '',
        user.email || '',
        user.role || 'user'
      );

      logger.info('Token refreshed successfully', {
        userId: user._id || 'unknown',
        email: user.email || 'unknown',
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      next(error);
    }
  };

  public static verifyEmail = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Verification token is required',
          error: 'MISSING_TOKEN',
        });
        return;
      }

      // Verify token
      let decoded;
      try {
        decoded = JwtUtils.verifyEmailVerificationToken(token);
      } catch (tokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired verification token',
          error: 'INVALID_TOKEN',
        });
        return;
      }

      // Check if token exists in user's tokens array and is not revoked
      const user = await User.findOne({
        'tokens.token': token,
        'tokens.type': TokenTypes.EMAIL_VERIFICATION,
        'tokens.isRevoked': false,
        'tokens.expiresAt': { $gt: new Date() }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired verification token',
          error: 'INVALID_TOKEN',
        });
        return;
      }

      // Update user email verification status and revoke the token
      await User.findByIdAndUpdate(user._id, {
        isEmailVerified: true,
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined,
      });

      // Revoke the email verification token
      await user.revokeToken(token);

      logger.info('Email verified successfully', {
        userId: decoded.userId,
        email: decoded.email,
      });

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      next(error);
    }
  };

  public static getProfile = async (
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

      const user = await User.findById(req.user._id);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: user.getPublicProfile(),
        },
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      next(error);
    }
  };
}
