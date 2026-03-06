# Validation System

This directory contains a comprehensive validation system using `express-validator` for your Node.js/Express application.

## Installation

The validation system requires `express-validator` which has been installed in your project:

```bash
npm install express-validator
```

## Usage

### Basic Usage

```typescript
import { Router } from 'express';
import { registerValidation, handleValidationErrors } from '@/validation';

const router = Router();

router.post('/register', 
  registerValidation,      // Apply validation rules
  handleValidationErrors,   // Handle validation errors
  yourController           // Your controller logic
);
```

### Available Validation Chains

#### Authentication
- `registerValidation` - User registration
- `loginValidation` - User login
- `passwordResetRequestValidation` - Password reset request
- `passwordResetValidation` - Password reset with token
- `emailVerificationValidation` - Email verification
- `refreshTokenValidation` - Token refresh

#### User Management
- `updateUserValidation` - Update user profile
- `changePasswordValidation` - Change user password
- `adminRoleUpdateValidation` - Admin role changes

#### Parameters & Queries
- `mongoIdValidation` - MongoDB ID validation
- `userIdValidation` - User ID parameter validation
- `paginationValidation` - Pagination parameters
- `userSearchValidation` - User search with filters

#### Admin & System
- `sendEmailValidation` - Send email validation
- `rateLimitConfigValidation` - Rate limiting configuration
- `healthCheckValidation` - Health check parameters

### Common Validation Groups

Use the `commonValidations` object for frequently used validation combinations:

```typescript
import { commonValidations } from '@/validation';

// Combined pagination and search
router.get('/users/search', 
  commonValidations.userSearch,
  handleValidationErrors,
  controller
);

// Just pagination
router.get('/users', 
  commonValidations.pagination,
  handleValidationErrors,
  controller
);
```

### Custom Validation

Create custom validation chains by combining existing validators:

```typescript
import { body, query } from '@/validation';

router.post('/custom', [
  ...commonValidations.pagination,
  body('customField').isLength({ min: 3 }).withMessage('Must be at least 3 characters'),
  query('filter').optional().isIn(['active', 'inactive']).withMessage('Invalid filter')
], handleValidationErrors, controller);
```

### File Upload Validation

Use the file upload validator for routes that accept file uploads:

```typescript
import { validateFileUpload } from '@/validation';

router.post('/upload', 
  validateFileUpload(['image/jpeg', 'image/png'], 5 * 1024 * 1024), // 5MB limit
  handleValidationErrors,
  controller
);
```

## Error Response Format

When validation fails, the system returns a standardized error response:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "invalid-email"
    }
  ]
}
```

## Migration from Joi

If you're currently using Joi validation (like in `authController.ts`), you can migrate by:

1. Replace Joi schemas with the provided validation chains
2. Remove Joi validation logic from controllers
3. Add validation chains to your routes
4. Let the validation middleware handle errors before reaching controllers

### Example Migration

**Before (Joi in controller):**
```typescript
// In authController.ts
const { error } = registerSchema.validate(req.body);
if (error) {
  return res.status(400).json(createValidationErrorResponse(error.details));
}
```

**After (express-validator in route):**
```typescript
// In route file
router.post('/register', 
  registerValidation,
  handleValidationErrors,
  authController.register
);

// In authController.ts - remove validation logic
export const register = async (req: Request, res: Response) => {
  // No validation needed here - already validated
  // Your business logic here
};
```

## Validation Rules Reference

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- Maximum 128 characters

### Name Requirements
- 2-50 characters
- Letters, spaces, hyphens, and apostrophes only

### Email Requirements
- Valid email format
- Maximum 255 characters
- Automatically normalized (lowercase)

### Pagination
- `page`: Positive integer (default: 1)
- `limit`: 1-100 (default: 10)
- `sortBy`: Specific allowed fields
- `sortOrder`: 'asc' or 'desc'

## Best Practices

1. **Always use `handleValidationErrors`** after validation chains
2. **Combine validation chains** for complex routes
3. **Use common validation groups** for repeated patterns
4. **Keep validation in routes**, not in controllers
5. **Use specific error messages** for better UX
6. **Validate both body and parameters** for complete coverage

## File Structure

```
src/validation/
├── index.ts          # Main validation exports
├── examples.ts       # Usage examples
└── README.md         # This documentation
```

The validation system is now ready to use throughout your application!
