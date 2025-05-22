import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('Authentication attempt without token');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };

    const session = await prisma.session.findFirst({
      where: {
        token,
        isActive: true,
        userId: decoded.id
      },
      include: {
        user: true
      }
    });

    if (!session) {
      logger.warn('Invalid or expired session', { userId: decoded.id });
      return res.status(401).json({ message: 'Invalid or expired session' });
    }

    req.user = session.user;
    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    return res.status(401).json({ message: 'Invalid token' });
  }
}; 