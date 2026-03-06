// Example usage of validation in routes
// This file shows how to use the validation system in your Express routes

import { Router, Request, Response } from 'express';
import { body, query } from 'express-validator';
import {
  registerValidation,
  loginValidation,
  handleValidationErrors,
  updateUserValidation,
  paginationValidation,
  mongoIdValidation,
  commonValidations,
} from './index';

// Mock controllers and middleware for demonstration
const mockAuthController = {
  register: (req: Request, res: Response) => res.json({ message: 'User registered' }),
  login: (req: Request, res: Response) => res.json({ message: 'User logged in' }),
  updateUser: (req: Request, res: Response) => res.json({ message: 'User updated' }),
  getUsers: (req: Request, res: Response) => res.json({ message: 'Users retrieved' }),
  searchUsers: (req: Request, res: Response) => res.json({ message: 'Users searched' }),
};

const mockRequireAuth = (req: Request, res: Response, next: any) => next();
const mockRequireAdmin = (req: Request, res: Response, next: any) => next();

const router = Router();

// Example: Register route with validation
router.post(
  '/register',
  registerValidation, // Validation rules
  handleValidationErrors, // Error handler
  mockAuthController.register // Controller
);

// Example: Login route with validation
router.post('/login', loginValidation, handleValidationErrors, mockAuthController.login);

// Example: Protected route with validation
router.put(
  '/users/:id',
  mockRequireAuth, // Authentication middleware
  mongoIdValidation, // ID parameter validation
  handleValidationErrors,
  updateUserValidation, // Body validation
  handleValidationErrors,
  mockAuthController.updateUser
);

// Example: Admin route with pagination
router.get(
  '/admin/users',
  mockRequireAuth,
  mockRequireAdmin,
  paginationValidation,
  handleValidationErrors,
  mockAuthController.getUsers
);

// Example: Using common validation chains
router.get(
  '/users/search',
  mockRequireAuth,
  commonValidations.userSearch, // Combined pagination and search validation
  handleValidationErrors,
  mockAuthController.searchUsers
);

// Example: Custom validation chain
router.post(
  '/custom-endpoint',
  mockRequireAuth,
  [
    // You can combine multiple validation chains
    ...commonValidations.pagination,
    body('customField')
      .isLength({ min: 3 })
      .withMessage('Custom field must be at least 3 characters'),
    query('filter').optional().isIn(['active', 'inactive']).withMessage('Invalid filter'),
  ],
  handleValidationErrors,
  (req: Request, res: Response) => {
    // Your controller logic here
    res.json({ message: 'Validated successfully' });
  }
);

export default router;
