import { Request, Response } from 'express';
import { PrismaClient, User, Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { encrypt, compare } from '../utils/encryption';
import logger from '../utils/logger';
import { handlePrismaError } from '../utils/prisma-error';
import { sendSuccess, sendError } from '../utils/response.util';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: User;
}

export const register = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, name, roleNames } = req.body;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      logger.warn('Registration attempt with existing email', { email });
      return sendError(res, 'Email already registered', 400);
    }

    // Get requesting user's role if authenticated
    let requestingUser = null;
    if (req.user) {
      requestingUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { roles: true }
      });
    }

    // Only SUPER_ADMIN can create SUPER_ADMIN users
    if (roleNames?.includes('SUPER_ADMIN') && (!requestingUser || !requestingUser.roles.some(role => role.name === 'SUPER_ADMIN'))) {
      logger.warn('Unauthorized SUPER_ADMIN creation attempt', { email });
      return sendError(res, 'Only super admin can create super admin users', 403);
    }

    // Get default role if not specified
    let roles: Role[] = [];
    if (roleNames) {
      roles = await prisma.role.findMany({
        where: { name: { in: roleNames } }
      });
    } else {
      const defaultRole = await prisma.role.findUnique({
        where: { name: 'LEADER' }
      });
      if (defaultRole) {
        roles = [defaultRole];
      }
    }

    // Hash password
    const hashedPassword = await encrypt(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        roles: {
          connect: roles.map(role => ({ id: role.id }))
        }
      },
      include: {
        roles: true
      }
    });

    logger.info('User registered successfully', { userId: user.id });
    return sendSuccess(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description
      }))
    }, 'User registered successfully', 201);
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: true,
        profile: true
      }
    });

    if (!user) {
      logger.warn('Login attempt with non-existent email', { email });
      return sendError(res, 'Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      logger.warn('Login attempt with invalid password', { email });
      return sendError(res, 'Invalid credentials', 401);
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roles: user.roles.map(role => role.name)
      },
      jwtSecret,
      { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
    );

    // Create session
    await prisma.session.create({
      data: {
        token,
        userId: user.id
      }
    });

    logger.info('User logged in successfully', { userId: user.id });
    return sendSuccess(res, {
      token,
      isNewUser: !user.profile,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles.map(role => ({
          id: role.id,
          name: role.name,
          description: role.description
        }))
      }
    }, 'Login successful');
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return sendError(res, 'No token provided', 401);
    }

    // Deactivate session
    await prisma.session.updateMany({
      where: { token },
      data: { isActive: false }
    });

    logger.info('User logged out successfully', { userId: req.user?.id ?? 'unknown' });
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    const prismaError = handlePrismaError(error);
    return sendError(res, prismaError.message, prismaError.statusCode);
  }
}; 