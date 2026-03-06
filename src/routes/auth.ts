import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { PasswordController } from '../controllers/passwordController';
import { authenticate } from '../middleware/auth';
import { requireEmailVerification } from '../middleware/rbac';
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

export default router;
