import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { handlePrismaError } from '../utils/prisma-error';

const prisma = new PrismaClient();

// Get all users (only accessible by SUPER_ADMIN)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: true
      }
    });

    res.json(users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description
      }))
    })));
  } catch (error) {
    const prismaError = handlePrismaError(error);
    res.status(prismaError.statusCode).json({ message: prismaError.message });
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
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description
      }))
    });
  } catch (error) {
    const prismaError = handlePrismaError(error);
    res.status(prismaError.statusCode).json({ message: prismaError.message });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, roleIds } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { roles: true }
    });

    if (!existingUser) {
      logger.warn('Update attempt for non-existent user', { userId: id });
      return res.status(404).json({ message: 'User not found' });
    }

    // Get requesting user's role
    const requestingUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { roles: true }
    });

    if (!requestingUser) {
      return res.status(401).json({ message: 'Requesting user not found' });
    }

    const isSuperAdmin = requestingUser.roles.some(role => role.name === 'SUPER_ADMIN');

    // Check permissions
    if (!isSuperAdmin && req.user.id !== id) {
      logger.warn('Unauthorized user update attempt', {
        requestingUserId: req.user.id,
        targetUserId: id
      });
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Only SUPER_ADMIN can change roles
    if (roleIds && !isSuperAdmin) {
      logger.warn('Unauthorized role update attempt', {
        requestingUserId: req.user.id,
        targetUserId: id
      });
      return res.status(403).json({ message: 'Only super admin can change roles' });
    }

    // Check if email is already taken by another user
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });
      if (emailExists) {
        logger.warn('Update attempt with existing email', { email });
        return res.status(400).json({ message: 'Email already in use' });
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
    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      roles: updatedUser.roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description
      }))
    });
  } catch (error) {
    const prismaError = handlePrismaError(error);
    res.status(prismaError.statusCode).json({ message: prismaError.message });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { roles: true }
    });

    if (!existingUser) {
      logger.warn('Delete attempt for non-existent user', { userId: id });
      return res.status(404).json({ message: 'User not found' });
    }

    // Get requesting user's role
    const requestingUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { roles: true }
    });

    if (!requestingUser) {
      return res.status(401).json({ message: 'Requesting user not found' });
    }

    const isSuperAdmin = requestingUser.roles.some(role => role.name === 'SUPER_ADMIN');

    // Only SUPER_ADMIN can delete users
    if (!isSuperAdmin) {
      logger.warn('Unauthorized user deletion attempt', {
        requestingUserId: req.user.id,
        targetUserId: id
      });
      return res.status(403).json({ message: 'Only super admin can delete users' });
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
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    const prismaError = handlePrismaError(error);
    res.status(prismaError.statusCode).json({ message: prismaError.message });
  }
}; 