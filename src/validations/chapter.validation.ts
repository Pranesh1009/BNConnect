import { z } from 'zod';
import { sendError } from '../utils/response.util';
import logger from '../utils/logger';

// Base chapter schema
const chapterSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters long'),
  description: z.string().optional(),
  content: z.string().optional(),
  isActive: z.boolean().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  userId: z.string().uuid('Invalid user ID').optional(),
  presidentId: z.string().uuid('Invalid president ID').optional(),
  vicePresidentId: z.string().uuid('Invalid vice president ID').optional()
});

// Create chapter schema
const createChapterSchema = chapterSchema;

// Update chapter schema (all fields optional)
const updateChapterSchema = chapterSchema.partial();

// Validation middleware factory
export const validateChapter = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
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
        return sendError(res, 'Validation failed', 400);
      }
      next(error);
    }
  };
};

export const validateCreateChapter = validateChapter(createChapterSchema);
export const validateUpdateChapter = validateChapter(updateChapterSchema); 