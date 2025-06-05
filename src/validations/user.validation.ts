import { z } from 'zod';
import { sendError } from '../utils/response.util';

// Mobile number regex pattern
const mobileNumberPattern = /^\+?[1-9]\d{1,14}$/;

// Base user schema
const userSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  mobileNumber: z.string().regex(mobileNumberPattern, 'Invalid mobile number format').optional(),
  roleNames: z.array(z.string()).optional()
});

// Create user schema (requires password)
const createUserSchema = userSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters long')
});

// Create user for chapter schema (password is optional as it will be generated)
const createUserForChapterSchema = userSchema.extend({
  chapterId: z.string().uuid('Invalid chapter ID'),
  roleNames: z.array(z.string()).optional()
});

// Update user schema (all fields optional)
const updateUserSchema = userSchema.partial();

// Validation middleware factory
export const validateUser = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    if (!schema) {
      return sendError(res, 'Validation schema is not defined', 500);
    }

    try {
      const validatedData = schema.parse(req.body);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return sendError(res, errors, 400);
      }
      next(error);
    }
  };
};

export const validateCreateUser = validateUser(createUserSchema);
export const validateCreateUserForChapter = validateUser(createUserForChapterSchema);
export const validateUpdateUser = validateUser(updateUserSchema); 