import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { encrypt, compare } from '../utils/encryption';
import logger from '../utils/logger';
import { handlePrismaError } from '../utils/prisma-error';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, roleNames } = req.body;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      logger.warn('Registration attempt with existing email', { email });
      return res.status(400).json({ message: 'Email already registered' });
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
      return res.status(403).json({ message: 'Only super admin can create super admin users' });
    }

    // Get default role if not specified
    let roles = [];
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

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: await encrypt(password),
        name,
        roles: {
          connect: roles.map(role => ({ id: role.id }))
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        roles: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        createdAt: true
      }
    });

    logger.info('User registered successfully', { userId: user.id });
    res.status(201).json(user);
  } catch (error) {
    const prismaError = handlePrismaError(error);
    res.status(prismaError.statusCode).json({ message: prismaError.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { roles: true }
    });

    if (!user) {
      logger.warn('Login attempt with non-existent email', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      logger.warn('Login attempt with invalid password', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
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
    res.json({
      token,
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
    });
  } catch (error) {
    const prismaError = handlePrismaError(error);
    res.status(prismaError.statusCode).json({ message: prismaError.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Deactivate session
    await prisma.session.updateMany({
      where: { token },
      data: { isActive: false }
    });

    logger.info('User logged out successfully', { userId: req.user.id });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    const prismaError = handlePrismaError(error);
    res.status(prismaError.statusCode).json({ message: prismaError.message });
  }
}; 