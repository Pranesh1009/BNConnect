import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import logger from '../utils/logger';
import { handlePrismaError } from '../utils/prisma-error';
import { sendSuccess, sendError } from '../utils/response.util';
import {
  PaginationParams,
  getPaginationParams,
  createSearchQuery,
  createSortQuery,
  createPaginatedResponse
} from '../utils/pagination.util';

const prisma = new PrismaClient();

// Create a new chapter
export const createChapter = async (req: Request, res: Response) => {
  try {
    const { title, description, content, isActive, userId, presidentId, vicePresidentId, stateId, cityId } = req.body;
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      return sendError(res, 'Authentication required', 401);
    }

    // Check if requesting user is SUPER_ADMIN
    const requestingUser = await prisma.user.findUnique({
      where: { id: requestingUserId },
      include: { roles: true }
    });

    if (!requestingUser || !requestingUser.roles.some(role => role.name === 'SUPER_ADMIN')) {
      logger.warn('Unauthorized chapter creation attempt', { userId: requestingUserId });
      return sendError(res, 'Only super admin can create chapters', 403);
    }

    // Verify users exist if provided
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return sendError(res, 'User not found', 404);
      }
    }

    if (presidentId) {
      const president = await prisma.user.findUnique({ where: { id: presidentId } });
      if (!president) {
        return sendError(res, 'President not found', 404);
      }
    }

    if (vicePresidentId) {
      const vicePresident = await prisma.user.findUnique({ where: { id: vicePresidentId } });
      if (!vicePresident) {
        return sendError(res, 'Vice President not found', 404);
      }
    }

    const chapter = await prisma.chapter.create({
      data: {
        title,
        description,
        content,
        isActive: isActive ?? true,
        stateId,
        cityId,
        userId,
        presidentId,
        vicePresidentId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        president: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        vicePresident: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    logger.info('Chapter created successfully', { chapterId: chapter.id });
    return sendSuccess(res, chapter, 'Chapter created successfully', 201);
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

// Get all chapters with pagination
export const getAllChapters = async (req: Request, res: Response) => {
  try {
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as PaginationParams;

    const { skip, take } = getPaginationParams(req);

    // Create search query for title and description
    const searchQuery = createSearchQuery(['title', 'description'], search) as Prisma.ChapterWhereInput;

    // Create where clause
    const where: Prisma.ChapterWhereInput = searchQuery || {};

    // Get total count for pagination
    const total = await prisma.chapter.count({ where });

    // Get paginated chapters
    const chapters = await prisma.chapter.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: createSortQuery(sortBy, sortOrder as 'asc' | 'desc')
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        president: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        vicePresident: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        state: true,
        city: true
      }
    });

    // Get user counts for each chapter
    const chaptersWithUserCount = await Promise.all(
      chapters.map(async (chapter) => {
        const userCount = await prisma.chapterMember.count({
          where: {
            chapterId: chapter.id
          }
        });
        return {
          ...chapter,
          userCount
        };
      })
    );

    // Create paginated response
    const paginatedResponse = createPaginatedResponse(
      chaptersWithUserCount,
      total,
      page,
      limit
    );

    return sendSuccess(res, paginatedResponse.data, 'Chapters retrieved successfully', 200, paginatedResponse.metadata);
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

// Get chapter by ID
export const getChapterById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        president: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        vicePresident: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        state: true,
        city: true
      }
    });

    if (!chapter) {
      logger.warn('Chapter not found', { chapterId: id });
      return sendError(res, 'Chapter not found', 404);
    }

    // Get user count for the chapter
    const userCount = await prisma.user.count({
      where: {
        chapters: {
          some: {
            id: chapter.id
          }
        }
      }
    });

    const chapterWithUserCount = {
      ...chapter,
      userCount
    };

    return sendSuccess(res, chapterWithUserCount, 'Chapter retrieved successfully');
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

// Update chapter
export const updateChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, content, isActive, presidentId, vicePresidentId, state, city } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    // Check if chapter exists
    const existingChapter = await prisma.chapter.findUnique({
      where: { id }
    });

    if (!existingChapter) {
      logger.warn('Update attempt for non-existent chapter', { chapterId: id });
      return sendError(res, 'Chapter not found', 404);
    }

    // Check if user owns the chapter
    if (existingChapter.userId !== userId) {
      logger.warn('Unauthorized chapter update attempt', {
        userId,
        chapterId: id
      });
      return sendError(res, 'Unauthorized access', 403);
    }

    // Verify president and vice president exist if provided
    if (presidentId) {
      const president = await prisma.user.findUnique({ where: { id: presidentId } });
      if (!president) {
        return sendError(res, 'President not found', 404);
      }
    }

    if (vicePresidentId) {
      const vicePresident = await prisma.user.findUnique({ where: { id: vicePresidentId } });
      if (!vicePresident) {
        return sendError(res, 'Vice President not found', 404);
      }
    }

    const updatedChapter = await prisma.chapter.update({
      where: { id },
      data: {
        title,
        description,
        content,
        isActive,
        state,
        city,
        presidentId,
        vicePresidentId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        president: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        vicePresident: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    logger.info('Chapter updated successfully', { chapterId: id });
    return sendSuccess(res, updatedChapter, 'Chapter updated successfully');
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

// Delete chapter
export const deleteChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    // Check if chapter exists
    const existingChapter = await prisma.chapter.findUnique({
      where: { id }
    });

    if (!existingChapter) {
      logger.warn('Delete attempt for non-existent chapter', { chapterId: id });
      return sendError(res, 'Chapter not found', 404);
    }

    // Check if user owns the chapter
    if (existingChapter.userId !== userId) {
      logger.warn('Unauthorized chapter deletion attempt', {
        userId,
        chapterId: id
      });
      return sendError(res, 'Unauthorized access', 403);
    }

    // Delete chapter
    await prisma.chapter.delete({
      where: { id }
    });

    logger.info('Chapter deleted successfully', { chapterId: id });
    return sendSuccess(res, null, 'Chapter deleted successfully');
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

// Get all states with optional search
export const getStates = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const { page, limit, skip } = getPaginationParams(req);

    const where: Prisma.StateWhereInput = search
      ? {
        OR: [
          { name: { contains: search as string, mode: Prisma.QueryMode.insensitive } },
          { code: { contains: search as string, mode: Prisma.QueryMode.insensitive } }
        ]
      }
      : {};

    const [states, total] = await Promise.all([
      prisma.state.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              cities: true,
              chapters: true
            }
          }
        }
      }),
      prisma.state.count({ where })
    ]);

    return res.json(createPaginatedResponse(states, total, page, limit));
  } catch (error) {
    console.error('Error in getStates:', error);
    return sendError(res, 'Failed to fetch states');
  }
};

// Get cities by state with optional search
export const getCities = async (req: Request, res: Response) => {
  try {
    const { stateId, search } = req.query;
    const { page, limit, skip } = getPaginationParams(req);

    if (!stateId) {
      return sendError(res, 'State ID is required', 400);
    }

    const where: Prisma.CityWhereInput = {
      stateId: stateId as string,
      ...(search
        ? {
          name: { contains: search as string, mode: Prisma.QueryMode.insensitive }
        }
        : {})
    };

    const [cities, total] = await Promise.all([
      prisma.city.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          state: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          _count: {
            select: {
              chapters: true
            }
          }
        }
      }),
      prisma.city.count({ where })
    ]);

    return res.json(createPaginatedResponse(cities, total, page, limit));
  } catch (error) {
    console.error('Error in getCities:', error);
    return sendError(res, 'Failed to fetch cities');
  }
}; 