import { Prisma } from '@prisma/client';
import { Request } from 'express';

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export const getPaginationParams = (req: Request | PaginationParams): { page: number; limit: number; skip: number; take: number } => {
  const page = typeof req === 'object' && 'query' in req
    ? parseInt(String(req.query.page)) || 1
    : parseInt(String(req.page)) || 1;

  const limit = typeof req === 'object' && 'query' in req
    ? parseInt(String(req.query.limit)) || 10
    : parseInt(String(req.limit)) || 10;

  // If page is -1, return all records
  if (page === -1) {
    return {
      page: 1,
      limit: 1000000, // A large number to get all records
      skip: 0,
      take: 1000000
    };
  }

  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
};

export const createSearchQuery = (searchFields: string[], searchTerm?: string): Prisma.UserWhereInput | undefined => {
  if (!searchTerm) return undefined;

  return {
    OR: searchFields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    }))
  };
};

export const createSortQuery = (sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.SortOrder => {
  return sortOrder.toLowerCase() as Prisma.SortOrder;
};

export const createPaginatedResponse = <T>(
  items: T[],
  total: number,
  page: number,
  limit?: number
): PaginatedResponse<T> => {
  // If page is -1, we're returning all items
  if (page === -1) {
    return {
      data: items,
      metadata: {
        total,
        page: -1,
        limit: total,
        totalPages: 1
      }
    };
  }

  const totalPages = Math.ceil(total / (limit || total));
  return {
    data: items,
    metadata: {
      total,
      page,
      limit: limit || total,
      totalPages
    }
  };
}; 