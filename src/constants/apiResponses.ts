/**
 * Common API response constants and messages
 */

export const API_RESPONSES = {
  // Success messages
  SUCCESS: {
    REGISTER: 'User registered successfully. Please check your email to verify your account.',
    LOGIN: 'Login successful',
    LOGOUT: 'Logout successful',
    TOKEN_REFRESH: 'Token refreshed successfully',
    EMAIL_VERIFIED: 'Email verified successfully',
    PASSWORD_RESET: 'Password has been reset successfully',
    PASSWORD_CHANGED: 'Password changed successfully',
    PROFILE_RETRIEVED: 'Profile retrieved successfully',
    TOKEN_SENT: 'If an account with that email exists, a password reset link has been sent.',
    TOKEN_VALID: 'Reset token is valid',
    REQUEST_PROCESSED: 'Request processed successfully',
  },

  // Error messages
  ERROR: {
    VALIDATION_FAILED: 'Validation failed',
    INVALID_CREDENTIALS: 'Invalid email or password',
    USER_EXISTS: 'User with this email already exists',
    USER_NOT_FOUND: 'User not found',
    INVALID_TOKEN: 'Invalid or expired token',
    TOKEN_EXPIRED: 'Token has expired',
    MISSING_TOKEN: 'Token is required',
    MISSING_REFRESH_TOKEN: 'Refresh token is required for logout',
    INVALID_REFRESH_TOKEN: 'Invalid or expired refresh token',
    AUTHENTICATION_REQUIRED: 'Authentication required',
    INSUFFICIENT_PRIVILEGES: 'Insufficient privileges to access this resource',
    ROLE_MISMATCH: 'Access restricted to specific role only',
    ROLE_NOT_ALLOWED: 'Your role is not authorized for this resource',
    EMAIL_NOT_VERIFIED: 'Email verification required to access this resource',
    RESOURCE_OWNERSHIP_REQUIRED: 'You can only access your own resources',
    INVALID_CURRENT_PASSWORD: 'Current password is incorrect',
    SAME_PASSWORD: 'New password must be different from current password',
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
    INTERNAL_ERROR: 'Internal server error',
    NOT_FOUND: 'Route not found',
    RESOURCE_USER_ID_MISSING: 'Resource user ID not found',
    INVALID_TOKEN_TYPE: 'Invalid token type',
  },

  // Status codes
  STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
  },

  // Error codes
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    USER_EXISTS: 'USER_EXISTS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    MISSING_TOKEN: 'MISSING_TOKEN',
    MISSING_REFRESH_TOKEN: 'MISSING_REFRESH_TOKEN',
    INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    INSUFFICIENT_PRIVILEGES: 'INSUFFICIENT_PRIVILEGES',
    ROLE_MISMATCH: 'ROLE_MISMATCH',
    ROLE_NOT_ALLOWED: 'ROLE_NOT_ALLOWED',
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
    RESOURCE_OWNERSHIP_REQUIRED: 'RESOURCE_OWNERSHIP_REQUIRED',
    INVALID_CURRENT_PASSWORD: 'INVALID_CURRENT_PASSWORD',
    SAME_PASSWORD: 'SAME_PASSWORD',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    RESOURCE_USER_ID_MISSING: 'RESOURCE_USER_ID_MISSING',
    INVALID_TOKEN_TYPE: 'INVALID_TOKEN_TYPE',
  },
} as const;

/**
 * Standard API response structure
 */
export const createSuccessResponse = <T = any>(message: string, data?: T) => ({
  success: true,
  message,
  data,
});

export const createErrorResponse = (message: string, error: string, statusCode?: number) => ({
  success: false,
  message,
  error,
  ...(statusCode && { statusCode }),
});

export const createValidationErrorResponse = (
  details: Array<{ field: string; message: string }>
) => ({
  success: false,
  message: API_RESPONSES.ERROR.VALIDATION_FAILED,
  error: API_RESPONSES.ERROR_CODES.VALIDATION_ERROR,
  details,
});

export const createRateLimitResponse = (retryAfter?: number) => ({
  success: false,
  message: API_RESPONSES.ERROR.RATE_LIMIT_EXCEEDED,
  error: API_RESPONSES.ERROR_CODES.RATE_LIMIT_EXCEEDED,
  ...(retryAfter && { retryAfter }),
});
