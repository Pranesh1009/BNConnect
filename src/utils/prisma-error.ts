import { Prisma } from '@prisma/client';
import logger from './logger';

export class PrismaError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'PrismaError';
  }
}

export const handlePrismaError = (error: unknown): PrismaError => {
  logger.error('Prisma error occurred', { error });

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new PrismaError(
          'A unique constraint would be violated on this operation',
          'UNIQUE_CONSTRAINT_VIOLATION',
          409
        );
      case 'P2025':
        return new PrismaError(
          'Record not found',
          'RECORD_NOT_FOUND',
          404
        );
      case 'P2003':
        return new PrismaError(
          'Foreign key constraint failed',
          'FOREIGN_KEY_CONSTRAINT_FAILED',
          400
        );
      default:
        return new PrismaError(
          'Database operation failed',
          'DATABASE_ERROR',
          500
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new PrismaError(
      'Invalid data provided',
      'VALIDATION_ERROR',
      400
    );
  }

  return new PrismaError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    500
  );
}; 