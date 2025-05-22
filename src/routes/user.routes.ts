import { Router } from 'express';
import { getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all users (only SUPER_ADMIN)
router.get('/', requireRole(['SUPER_ADMIN']), getAllUsers);

// Get user by ID (SUPER_ADMIN or self)
router.get('/:id', requireRole(['SUPER_ADMIN']), getUserById);

// Update user (SUPER_ADMIN or self)
router.put('/:id', requireRole(['SUPER_ADMIN']), updateUser);

// Delete user (only SUPER_ADMIN)
router.delete('/:id', requireRole(['SUPER_ADMIN']), deleteUser);

export default router; 