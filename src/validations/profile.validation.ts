import { z } from 'zod';
import { sendError } from '../utils/response.util';

// Base profile schema with common fields
const baseProfileSchema = z.object({
  bio: z.string().optional(),
  avatar: z.string().url().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  industry: z.string().optional().nullable(),
  tier: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  address1: z.string().optional().nullable(),
  address2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

// Create profile validation schema
export const createProfileSchema = baseProfileSchema;

// Update profile validation schema
export const updateProfileSchema = baseProfileSchema.partial();

// Validation middleware factory
export const validateProfile = (schema: z.ZodType) => {
  return async (req: any, res: any, next: any) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendError(res, 'Validation failed', 400);
      }
      next(error);
    }
  };
}; 