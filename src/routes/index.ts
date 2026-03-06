import { Router } from 'express';
import authRoutes from './auth';
import bannerRoutes from './banner';
import { createSuccessResponse } from '../constants/apiResponses';
import { getSystemInfo, getContactInfo } from '../constants/systemInfo';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  const systemInfo = getSystemInfo();
  res.status(200).json(
    createSuccessResponse('API is running', {
      ...systemInfo,
      contact: getContactInfo(),
    })
  );
});

// API routes
router.use('/auth', authRoutes);
router.use('/banners', bannerRoutes);

export default router;
