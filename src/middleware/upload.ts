import multer from 'multer';
import { Request } from 'express';

// Configure multer for memory storage (for Cloudinary upload)
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if the file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only one file at a time
  },
});

// Export middleware for single image upload
export const uploadSingleImage = upload.single('profileImage');

// Export middleware for banner image upload
export const uploadBannerImage = upload.single('image');

// Export multer instance for other uses
export { upload };
