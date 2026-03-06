import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { PasswordController } from '../controllers/passwordController';
import { authenticate } from '../middleware/auth';
import { requireEmailVerification } from '../middleware/rbac';
import { uploadSingleImage } from '../middleware/upload';
import {
  registrationRateLimit,
  loginRateLimit,
  passwordResetRateLimit,
  emailVerificationRateLimit,
  authRateLimit,
} from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access   Public
 * @rateLimit 3 requests per hour per IP
 */
router.post('/register', registrationRateLimit, AuthController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access   Public
 * @rateLimit 5 requests per 15 minutes per IP
 */
router.post('/login', loginRateLimit, AuthController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access   Private
 * @rateLimit 100 requests per 15 minutes per user
 */
router.post('/logout', authenticate, authRateLimit, AuthController.logout);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access   Public (requires valid refresh token)
 * @rateLimit 10 requests per 15 minutes per IP
 */
router.post('/refresh-token', authRateLimit, AuthController.refreshToken);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access   Public
 * @rateLimit 5 requests per hour per IP
 */
router.post('/verify-email', emailVerificationRateLimit, AuthController.verifyEmail);

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access   Private
 * @rateLimit 100 requests per 15 minutes per user
 */
router.get('/profile', authenticate, authRateLimit, AuthController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access   Private
 * @rateLimit 20 requests per 15 minutes per user
 */
router.put('/profile', authenticate, authRateLimit, AuthController.updateProfile);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get active sessions
 * @access   Private
 * @rateLimit 50 requests per 15 minutes per user
 */
router.get('/sessions', authenticate, authRateLimit, AuthController.getActiveSessions);

/**
 * @route   POST /api/auth/revoke-session
 * @desc    Revoke a specific session
 * @access   Private
 * @rateLimit 20 requests per 15 minutes per user
 */
router.post('/revoke-session', authenticate, authRateLimit, AuthController.revokeSession);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access   Public
 * @rateLimit 3 requests per hour per IP
 */
router.post('/forgot-password', passwordResetRateLimit, PasswordController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access   Public
 * @rateLimit 5 requests per hour per IP
 */
router.post('/reset-password', passwordResetRateLimit, PasswordController.resetPassword);

/**
 * @route   POST /api/auth/verify-reset-token
 * @desc    Verify password reset token
 * @access   Public
 * @rateLimit 5 requests per hour per IP
 */
router.post('/verify-reset-token', passwordResetRateLimit, PasswordController.verifyResetToken);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated user)
 * @access   Private
 * @rateLimit 5 requests per hour per user
 */
router.post('/change-password', authenticate, authRateLimit, PasswordController.changePassword);

/**
 * @route   POST /api/auth/upload-profile-image
 * @desc    Upload profile image to Cloudinary
 * @access   Private
 * @rateLimit 10 requests per hour per user
 */
router.post('/upload-profile-image', authenticate, authRateLimit, uploadSingleImage, AuthController.uploadProfileImage);

/**
 * @route   DELETE /api/auth/profile-image
 * @desc    Delete profile image from Cloudinary
 * @access   Private
 * @rateLimit 10 requests per hour per user
 */
router.delete('/profile-image', authenticate, authRateLimit, AuthController.deleteProfileImage);

export default router;
