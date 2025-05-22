import { Router } from 'express';
import { getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireSuperAdmin, requireAdmin, requireLeader } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all users (super admin only)
router.get('/', requireLeader, getAllUsers);

// Get user by ID (users can view their own profile, super admin can view any)
router.get('/:id', getUserById);

// Update user (users can update their own profile, super admin can update any)
router.put('/:id', updateUser);

// Delete user (super admin only)
router.delete('/:id', requireSuperAdmin, deleteUser);

export default router; 