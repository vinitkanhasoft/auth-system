import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { createErrorResponse } from '../constants/apiResponses';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    res.status(400).json(
      createErrorResponse(
        `Validation failed: ${errorMessages.join(', ')}`,
        'VALIDATION_ERROR',
        400
      )
    );
    return;
  }
  
  next();
};
