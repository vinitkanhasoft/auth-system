import { Response, NextFunction } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import User, { UserDocument } from '../models/User';
import Session from '../models/Session';
import { JwtUtils } from '../utils/jwt';
import { TokenTypes } from '../enums/TokenTypes';
import { CloudinaryService } from '../services/cloudinaryService';
import {
  IAuthRequest,
  IRegisterData,
  ILoginData,
  IAuthResponse,
  IRefreshTokenRequest,
  IUpdateProfile,
} from '../types';
import { logger } from '../utils/logger';
import { emailService } from '../services/emailService';
import { extractDeviceInfo } from '../utils/deviceInfo';
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

const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters',
  }),
  lastName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters',
  }),
  email: Joi.string().email().optional().messages({
    'string.email': 'Please provide a valid email address',
  }),
  phone: Joi.string().pattern(new RegExp('^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$')).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number (e.g., +1234567890, (123) 456-7890, 123-456-7890)',
  }),
  phoneCountryCode: Joi.string().pattern(/^\+\d{1,3}$/).optional().messages({
    'string.pattern.base': 'Please provide a valid country code (e.g., +1, +91)',
  }),
  address: Joi.string().max(500).optional().messages({
    'string.max': 'Address cannot exceed 500 characters',
  }),
  dateOfBirth: Joi.date().iso().max('now').optional().messages({
    'date.format': 'Date of birth must be in ISO format (YYYY-MM-DD)',
    'date.max': 'Date of birth cannot be in the future',
  }),
  profileImage: Joi.string().uri().optional().messages({
    'string.uri': 'Profile image must be a valid URL',
  }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
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

      // Extract device information
      const deviceInfo = extractDeviceInfo(req);
      
      // Create session ID
      const sessionId = uuidv4();
      
      // Add session (automatically limits to 4 sessions)
      await Session.addSession(user._id.toString(), {
        sessionId,
        device: deviceInfo.device,
        ip: deviceInfo.ip,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        location: deviceInfo.location,
        loginTime: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: true 
        }),
        active: true
      });

      // Revoke all old refresh tokens for this user (except the new one)
      await user.revokeAllTokens(TokenTypes.REFRESH_TOKEN);
      
      // Re-enable the new refresh token (since revokeAllTokens disabled it)
      const newToken = user.tokens?.find(t => t.token === refreshToken);
      if (newToken) {
        newToken.isRevoked = false;
      }
      
      // Clean up expired tokens to prevent document bloat
      await user.cleanupExpiredTokens();
      
      await user.save();

      const authResponse: IAuthResponse = {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken,
      };

      logger.info('User logged in successfully', {
        userId: user._id,
        email: user.email,
        sessionId,
        device: deviceInfo.device,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          ...authResponse,
          sessionId,
        },
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
      const { refreshToken, sessionId } = req.body;

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
        // Clean up expired tokens periodically
        await user.cleanupExpiredTokens();
      }

      // Deactivate the session if sessionId is provided
      if (sessionId && req.user?._id) {
        await Session.deactivateSession(req.user._id.toString(), sessionId);
      }

      logger.info('User logged out successfully', {
        userId: req.user?._id,
        email: req.user?.email,
        sessionId,
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

  public static getActiveSessions = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user || !req.user._id) {
        res.status(401).json(
          createErrorResponse(
            API_RESPONSES.ERROR.AUTHENTICATION_REQUIRED,
            API_RESPONSES.ERROR_CODES.AUTHENTICATION_REQUIRED,
            401
          )
        );
        return;
      }

      const sessionDoc = await Session.findActiveByUser(req.user._id.toString());
      
      if (!sessionDoc) {
        res.status(200).json({
          success: true,
          message: 'No active sessions found',
          data: {
            sessions: [],
          },
        });
        return;
      }

      // Filter only active sessions and sort by last active
      const activeSessions = sessionDoc.sessions
        .filter(session => session.active)
        .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());

      res.status(200).json({
        success: true,
        message: 'Active sessions retrieved successfully',
        data: {
          sessions: activeSessions,
        },
      });
    } catch (error) {
      logger.error('Get active sessions error:', error);
      next(error);
    }
  };

  public static revokeSession = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user || !req.user._id) {
        res.status(401).json(
          createErrorResponse(
            API_RESPONSES.ERROR.AUTHENTICATION_REQUIRED,
            API_RESPONSES.ERROR_CODES.AUTHENTICATION_REQUIRED,
            401
          )
        );
        return;
      }

      const { sessionId } = req.body;

      if (!sessionId) {
        res.status(400).json(
          createErrorResponse(
            'Session ID is required',
            'MISSING_SESSION_ID',
            400
          )
        );
        return;
      }

      const updatedSession = await Session.deactivateSession(req.user._id.toString(), sessionId);

      if (!updatedSession) {
        res.status(404).json(
          createErrorResponse(
            'Session not found',
            'SESSION_NOT_FOUND',
            404
          )
        );
        return;
      }

      logger.info('Session revoked successfully', {
        userId: req.user._id,
        sessionId,
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      logger.error('Revoke session error:', error);
      next(error);
    }
  };

  public static updateProfile = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user || !req.user._id) {
        res.status(401).json(
          createErrorResponse(
            API_RESPONSES.ERROR.AUTHENTICATION_REQUIRED,
            API_RESPONSES.ERROR_CODES.AUTHENTICATION_REQUIRED,
            401
          )
        );
        return;
      }

      const { error, value } = updateProfileSchema.validate(req.body);
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

      const updateData: IUpdateProfile = value;

      // Find user and update profile
      const user = await User.findById(req.user._id);
      if (!user) {
        res.status(404).json(
          createErrorResponse(
            API_RESPONSES.ERROR.USER_NOT_FOUND,
            API_RESPONSES.ERROR_CODES.USER_NOT_FOUND,
            404
          )
        );
        return;
      }

      // Update only provided fields
      if (updateData.firstName !== undefined) {
        user.firstName = updateData.firstName;
      }
      if (updateData.lastName !== undefined) {
        user.lastName = updateData.lastName;
      }
      if (updateData.email !== undefined) {
        user.email = updateData.email;
      }
      if (updateData.phone !== undefined) {
        user.phone = updateData.phone;
      }
      if (updateData.phoneCountryCode !== undefined) {
        user.phoneCountryCode = updateData.phoneCountryCode;
      }
      if (updateData.address !== undefined) {
        user.address = updateData.address;
      }
      if (updateData.dateOfBirth !== undefined) {
        user.dateOfBirth = new Date(updateData.dateOfBirth);
      }
      if (updateData.profileImage !== undefined) {
        // If it's a Cloudinary URL update, just update the URL
        // Old image cleanup should be handled separately
        user.profileImage = updateData.profileImage;
      }

      await user.save();

      logger.info('Profile updated successfully', {
        userId: user._id,
        email: user.email,
        updatedFields: Object.keys(updateData),
      });

      res.status(200).json(
        createSuccessResponse('Profile updated successfully', {
          user: user.getPublicProfile(),
        })
      );
    } catch (error) {
      logger.error('Update profile error:', error);
      next(error);
    }
  };

  // Get user's active sessions
  public static getSessions = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const sessionData = await Session.findActiveByUser(userId.toString());
      
      if (!sessionData) {
        res.status(200).json({
          success: true,
          message: 'No active sessions found',
          data: { sessions: [] },
        });
        return;
      }

      // Filter only active sessions
      const activeSessions = sessionData.sessions.filter(session => session.active);

      res.status(200).json({
        success: true,
        message: 'Sessions retrieved successfully',
        data: { sessions: activeSessions },
      });
    } catch (error) {
      logger.error('Get sessions error:', error);
      next(error);
    }
  };

  // Helper method to parse user agent string
  private static parseUserAgent(userAgent: string): { device: string; browser: string; os: string } {
    // Simple user agent parsing for device, browser, and OS detection
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Unknown';

    // Browser detection
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // OS detection
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    // Device detection
    if (userAgent.includes('Mobile')) device = 'Mobile';
    else if (userAgent.includes('Tablet')) device = 'Tablet';
    else device = 'Desktop';

    return {
      device: `${browser} on ${device}`,
      browser,
      os,
    };
  }

  /**
   * Upload profile image with Cloudinary management
   */
  public static uploadProfileImage = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check if Cloudinary is configured
      if (!CloudinaryService.isConfigured()) {
        res.status(500).json(
          createErrorResponse(
            'Cloudinary is not configured',
            'CLOUDINARY_NOT_CONFIGURED',
            500
          )
        );
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json(
          createErrorResponse(
            'No image file provided',
            'MISSING_IMAGE_FILE',
            400
          )
        );
        return;
      }

      // Find user
      if (!req.user || !req.user._id) {
        res.status(401).json(
          createErrorResponse(
            'User not authenticated',
            'USER_NOT_AUTHENTICATED',
            401
          )
        );
        return;
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        res.status(404).json(
          createErrorResponse(
            API_RESPONSES.ERROR.USER_NOT_FOUND,
            API_RESPONSES.ERROR_CODES.USER_NOT_FOUND,
            404
          )
        );
        return;
      }

      try {
        // Upload new image and delete old one if it exists
        const result = await CloudinaryService.updateProfileImage(
          user._id.toString(),
          req.file.buffer,
          user.profileImagePublicId
        );

        // Update user with new image info
        user.profileImage = result.url;
        user.profileImagePublicId = result.publicId;
        await user.save();

        logger.info('Profile image uploaded successfully', {
          userId: user._id,
          newPublicId: result.publicId,
          oldPublicId: user.profileImagePublicId,
        });

        res.status(200).json(
          createSuccessResponse('Profile image uploaded successfully', {
            profileImage: result.url,
            profileImagePublicId: result.publicId,
            user: user.getPublicProfile(),
          })
        );
      } catch (uploadError) {
        logger.error('Error uploading profile image:', uploadError);
        const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown upload error';
        res.status(500).json(
          createErrorResponse(
            `Failed to upload profile image: ${errorMessage}`,
            'IMAGE_UPLOAD_FAILED',
            500
          )
        );
        return;
      }
    } catch (error) {
      logger.error('Upload profile image error:', error);
      next(error);
    }
  };

  /**
   * Delete profile image from Cloudinary and user profile
   */
  public static deleteProfileImage = async (
    req: IAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user._id) {
        res.status(401).json(
          createErrorResponse(
            'User not authenticated',
            'USER_NOT_AUTHENTICATED',
            401
          )
        );
        return;
      }

      // Find user
      const user = await User.findById(req.user._id);
      if (!user) {
        res.status(404).json(
          createErrorResponse(
            API_RESPONSES.ERROR.USER_NOT_FOUND,
            API_RESPONSES.ERROR_CODES.USER_NOT_FOUND,
            404
          )
        );
        return;
      }

      // Check if user has a profile image to delete
      if (!user.profileImagePublicId) {
        res.status(400).json(
          createErrorResponse(
            'No profile image to delete',
            'NO_PROFILE_IMAGE',
            400
          )
        );
        return;
      }

      try {
        // Delete from Cloudinary
        const deleted = await CloudinaryService.deleteImage(user.profileImagePublicId);
        
        if (deleted) {
          logger.info('Profile image deleted from Cloudinary', {
            userId: user._id,
            publicId: user.profileImagePublicId,
          });
        } else {
          logger.warn('Failed to delete profile image from Cloudinary', {
            userId: user._id,
            publicId: user.profileImagePublicId,
          });
        }

        // Update user profile
        user.profileImage = `/avatars/${user.firstName?.toLowerCase()}-${user.lastName?.toLowerCase()}.jpg`;
        user.profileImagePublicId = null;
        await user.save();

        res.status(200).json(
          createSuccessResponse('Profile image deleted successfully', {
            user: user.getPublicProfile(),
          })
        );
      } catch (deleteError) {
        logger.error('Error deleting profile image:', deleteError);
        res.status(500).json(
          createErrorResponse(
            'Failed to delete profile image',
            'IMAGE_DELETE_FAILED',
            500
          )
        );
        return;
      }
    } catch (error) {
      logger.error('Delete profile image error:', error);
      next(error);
    }
  };
}
