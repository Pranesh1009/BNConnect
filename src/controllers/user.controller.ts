import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { handlePrismaError } from '../utils/prisma-error';
import { sendSuccess, sendError } from '../utils/response.util';

const prisma = new PrismaClient();

// Get all users (only accessible by SUPER_ADMIN)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: true
      }
    });

    return sendSuccess(res, users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description
      }))
    })), 'Users retrieved successfully');
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
    const { name, email, roleIds } = req.body;

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

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
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