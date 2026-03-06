import express from 'express';
import { body, param, query } from 'express-validator';
import {
  createBanner,
  getAllBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
  bulkDeleteBanners
} from '@/controllers/bannerController';
import { authenticate } from '@/middleware/auth';
import { uploadBannerImage } from '@/middleware/upload';
import { authRateLimit } from '@/middleware/rateLimiter';
import { validateRequest } from '@/middleware/validateRequest';

const router = express.Router();

/**
 * @route   POST /api/banners
 * @desc    Create a new banner with image upload
 * @access  Private (Admin only)
 * @example POST /api/banners
 */
router.post(
  '/',
  authenticate,
  authRateLimit,
  uploadBannerImage,
  [
    body('title')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title must be between 1 and 100 characters'),
    body('description')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Description must be between 1 and 500 characters'),
    body('altText')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Alt text must be between 1 and 100 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('displayOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Display order must be a non-negative integer')
  ],
  validateRequest,
  createBanner
);

/**
 * @route   GET /api/banners
 * @desc    Get all banners with pagination and filtering
 * @access  Public
 * @example GET /api/banners?page=1&limit=10&isActive=true&sortBy=displayOrder&sortOrder=asc
 */
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    query('sortBy')
      .optional()
      .isIn(['title', 'displayOrder', 'createdAt', 'updatedAt'])
      .withMessage('Sort by must be one of: title, displayOrder, createdAt, updatedAt'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],
  validateRequest,
  getAllBanners
);

/**
 * @route   GET /api/banners/:id
 * @desc    Get banner by ID
 * @access  Public
 * @example GET /api/banners/507f1f77bcf86cd799439011
 */
router.get(
  '/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid banner ID format')
  ],
  validateRequest,
  getBannerById
);

/**
 * @route   PUT /api/banners/:id
 * @desc    Update banner with optional image replacement
 * @access  Private (Admin only)
 * @example PUT /api/banners/507f1f77bcf86cd799439011
 */
router.put(
  '/:id',
  authenticate,
  authRateLimit,
  uploadBannerImage,
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid banner ID format'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Description must be between 1 and 500 characters'),
    body('altText')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Alt text must be between 1 and 100 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('displayOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Display order must be a non-negative integer')
  ],
  validateRequest,
  updateBanner
);

/**
 * @route   DELETE /api/banners/:id
 * @desc    Delete banner and remove image from Cloudinary
 * @access  Private (Admin only)
 * @example DELETE /api/banners/507f1f77bcf86cd799439011
 */
router.delete(
  '/:id',
  authenticate,
  authRateLimit,
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid banner ID format')
  ],
  validateRequest,
  deleteBanner
);

/**
 * @route   DELETE /api/banners/bulk-delete
 * @desc    Bulk delete banners and remove images from Cloudinary
 * @access  Private (Admin only)
 * @example DELETE /api/banners/bulk-delete
 */
router.delete(
  '/bulk-delete',
  authenticate,
  authRateLimit,
  [
    body('bannerIds')
      .isArray({ min: 1 })
      .withMessage('Banner IDs must be a non-empty array'),
    body('bannerIds.*')
      .isMongoId()
      .withMessage('All banner IDs must be valid MongoDB IDs')
  ],
  validateRequest,
  bulkDeleteBanners
);

export default router;
