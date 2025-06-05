import { Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import logger from '../utils/logger';
import { handlePrismaError } from '../utils/prisma-error';
import { sendSuccess, sendError } from '../utils/response.util';
import { encrypt } from '../utils/encryption.util';
import { generatePassword } from '../utils/password.util';
import { sendWelcomeEmail } from '../utils/email.util';
import {
  PaginationParams,
  getPaginationParams,
  createSearchQuery,
  createSortQuery,
  createPaginatedResponse
} from '../utils/pagination.util';
import { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Get all users (only accessible by SUPER_ADMIN)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as PaginationParams;

    const { skip, take, page: currentPage, limit: pageLimit } = getPaginationParams({ page, limit });

    // Create search query for name, email, and mobile number
    const searchQuery = createSearchQuery(['name', 'email', 'mobileNumber'], search);

    // Create where clause
    const where = searchQuery || {};

    // Get total count for pagination
    const total = await prisma.user.count({ where });

    // Get paginated users
    const users = await prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: createSortQuery(sortBy, sortOrder as 'asc' | 'desc')
      },
      include: {
        roles: true,
        profile: true
      }
    });

    // Transform user data
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      mobileNumber: user.mobileNumber,
      isNewUser: !user.profile,
      roles: user.roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description
      }))
    }));

    // Create paginated response
    const paginatedResponse = createPaginatedResponse(
      transformedUsers,
      total,
      currentPage,
      pageLimit
    );

    return sendSuccess(res, paginatedResponse.data, "Users retrieved successfully", 200, paginatedResponse.metadata);
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: true
      }
    });

    if (!user) {
      logger.warn('User not found', { userId: id });
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      mobileNumber: user.mobileNumber,
      roles: user.roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description
      }))
    }, 'User retrieved successfully');
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, mobileNumber, roleIds } = req.body;

    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { roles: true }
    });

    if (!existingUser) {
      logger.warn('Update attempt for non-existent user', { userId: id });
      return sendError(res, 'User not found', 404);
    }

    // Get requesting user's role
    const requestingUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { roles: true }
    });

    if (!requestingUser) {
      return sendError(res, 'Requesting user not found', 401);
    }

    const isSuperAdmin = requestingUser.roles.some(role => role.name === 'SUPER_ADMIN');

    // Check permissions
    if (!isSuperAdmin && req.user.id !== id) {
      logger.warn('Unauthorized user update attempt', {
        requestingUserId: req.user.id,
        targetUserId: id
      });
      return sendError(res, 'Unauthorized access', 403);
    }

    // Only SUPER_ADMIN can change roles
    if (roleIds && !isSuperAdmin) {
      logger.warn('Unauthorized role update attempt', {
        requestingUserId: req.user.id,
        targetUserId: id
      });
      return sendError(res, 'Only super admin can change roles', 403);
    }

    // Check if email is already taken by another user
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });
      if (emailExists) {
        logger.warn('Update attempt with existing email', { email });
        return sendError(res, 'Email already in use', 400);
      }
    }

    // Check if mobile number is already taken by another user
    if (mobileNumber && mobileNumber !== existingUser.mobileNumber) {
      const mobileExists = await prisma.user.findUnique({
        where: { mobileNumber }
      });
      if (mobileExists) {
        logger.warn('Update attempt with existing mobile number', { mobileNumber });
        return sendError(res, 'Mobile number already in use', 400);
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        mobileNumber,
        roles: roleIds ? {
          set: roleIds.map((roleId: string) => ({ id: roleId }))
        } : undefined
      },
      include: {
        roles: true
      }
    });

    logger.info('User updated successfully', { userId: id });
    return sendSuccess(res, {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      mobileNumber: updatedUser.mobileNumber,
      roles: updatedUser.roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description
      }))
    }, 'User updated successfully');
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { roles: true }
    });

    if (!existingUser) {
      logger.warn('Delete attempt for non-existent user', { userId: id });
      return sendError(res, 'User not found', 404);
    }

    // Get requesting user's role
    const requestingUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { roles: true }
    });

    if (!requestingUser) {
      return sendError(res, 'Requesting user not found', 401);
    }

    const isSuperAdmin = requestingUser.roles.some(role => role.name === 'SUPER_ADMIN');

    // Only SUPER_ADMIN can delete users
    if (!isSuperAdmin) {
      logger.warn('Unauthorized user deletion attempt', {
        requestingUserId: req.user.id,
        targetUserId: id
      });
      return sendError(res, 'Only super admin can delete users', 403);
    }

    // Delete user's sessions first
    await prisma.session.deleteMany({
      where: { userId: id }
    });

    // Delete user
    await prisma.user.delete({
      where: { id }
    });

    logger.info('User deleted', { userId: id });
    return sendSuccess(res, null, 'User deleted successfully');
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

// Create user and assign to chapter (SUPER_ADMIN only)
export const createUserForChapter = async (req: Request, res: Response) => {
  try {
    const { email, name, mobileNumber, chapterId, roleNames } = req.body;
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
      logger.warn('Unauthorized user creation attempt', { userId: requestingUserId });
      return sendError(res, 'Only super admin can create users for chapters', 403);
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      logger.warn('User creation attempt with existing email', { email });
      return sendError(res, 'Email already registered', 400);
    }

    // Check if mobile number already exists
    if (mobileNumber) {
      const existingMobile = await prisma.user.findUnique({
        where: { mobileNumber }
      });

      if (existingMobile) {
        logger.warn('User creation attempt with existing mobile number', { mobileNumber });
        return sendError(res, 'Mobile number already registered', 400);
      }
    }

    // Check if chapter exists
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    });

    if (!chapter) {
      logger.warn('User creation attempt for non-existent chapter', { chapterId });
      return sendError(res, 'Chapter not found', 404);
    }

    // Get roles
    let roles: Role[] = [];
    if (roleNames) {
      roles = await prisma.role.findMany({
        where: { name: { in: roleNames } }
      });
    } else {
      const defaultRole = await prisma.role.findUnique({
        where: { name: 'MEMBER' }
      });
      if (defaultRole) {
        roles = [defaultRole];
      }
    }

    // Generate password
    const generatedPassword = generatePassword();
    const hashedPassword = await encrypt(generatedPassword);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        mobileNumber,
        roles: {
          connect: roles.map(role => ({ id: role.id }))
        },
        chapterMemberships: {
          create: {
            chapterId,
            role: roleNames?.includes('LEADER') ? 'LEADER' : 'MEMBER'
          }
        }
      },
      include: {
        roles: true
      }
    });

    // Update chapter with the new user as president or vice president
    const updateData: any = {};
    if (!chapter.presidentId) {
      updateData.presidentId = user.id;
    } else if (!chapter.vicePresidentId) {
      updateData.vicePresidentId = user.id;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.chapter.update({
        where: { id: chapterId },
        data: updateData
      });
    }

    // Send welcome email with credentials
    try {
      await sendWelcomeEmail(email, name, generatedPassword);
    } catch (error) {
      logger.error('Failed to send welcome email', { error, userId: user.id });
      // Don't fail the request if email sending fails
    }

    logger.info('User created and assigned to chapter successfully', {
      userId: user.id,
      chapterId
    });

    return sendSuccess(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      mobileNumber: user.mobileNumber,
      roles: user.roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description
      })),
      chapterId,
      assignedPosition: Object.keys(updateData)[0]?.replace('Id', '') || 'member'
    }, 'User created and assigned to chapter successfully', 201);
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

// Get users by chapter
export const getUsersByChapter = async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params;
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as PaginationParams;

    // Check if chapter exists
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    });

    if (!chapter) {
      logger.warn('Attempt to get users for non-existent chapter', { chapterId });
      return sendError(res, 'Chapter not found', 404);
    }

    const { skip, take, page: currentPage, limit: pageLimit } = getPaginationParams({ page, limit });

    // Create search query for name and email
    const searchQuery = createSearchQuery(['name', 'email'], search);

    // Create where clause to find users related to the chapter
    const where: Prisma.UserWhereInput = {
      AND: [
        searchQuery || {},
        {
          OR: [
            { id: chapter.userId || undefined },
            { id: chapter.presidentId || undefined },
            { id: chapter.vicePresidentId || undefined },
            { chapterMemberships: { some: { chapterId } } }
          ].filter(condition => {
            if ('id' in condition) {
              return condition.id !== undefined;
            }
            return true;
          })
        }
      ]
    };

    // Get total count for pagination
    const total = await prisma.user.count({ where });

    // Get paginated users
    const users = await prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: createSortQuery(sortBy, sortOrder as 'asc' | 'desc')
      },
      include: {
        roles: true,
        profile: true
      }
    });

    // Transform user data and add their role in the chapter
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      mobileNumber: user.mobileNumber,
      isNewUser: !user.profile,
      roles: user.roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description
      })),
      profile: user.profile,
      chapter: chapter.title
    }));

    // Create paginated response
    const paginatedResponse = createPaginatedResponse(
      transformedUsers,
      total,
      currentPage,
      pageLimit
    );

    return sendSuccess(res, paginatedResponse.data, 'Chapter users retrieved successfully', 200, paginatedResponse.metadata);
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
}; 