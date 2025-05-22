import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export const requireRole = (roleNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        logger.warn('Authentication required for role check');
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { roles: true }
      });

      if (!user) {
        logger.warn('User not found during role check', { userId: req.user.id });
        return res.status(401).json({ message: 'User not found' });
      }

      const hasRequiredRole = user.roles.some(role => roleNames.includes(role.name));
      if (!hasRequiredRole) {
        logger.warn('Insufficient permissions', {
          userId: req.user.id,
          requiredRoles: roleNames,
          userRoles: user.roles.map(r => r.name)
        });
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      logger.error('Error in role middleware', { error });
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

// Helper middleware for specific roles
export const requireSuperAdmin = requireRole(['SUPER_ADMIN']);
export const requireAdmin = requireRole(['SUPER_ADMIN', 'SUB_ADMIN']);
export const requireLeader = requireRole(['SUPER_ADMIN', 'SUB_ADMIN', 'LEADER']); 