import { Router } from 'express';
import { getAllUsers, getUserById, updateUser, deleteUser, createUserForChapter, getUsersByChapter } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateCreateUser, validateCreateUserForChapter, validateUpdateUser } from '../validations/user.validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all users (SUPER_ADMIN only)
router.get('/', requireRole(['SUPER_ADMIN']), getAllUsers);

// Get users by chapter
router.get('/chapter/:chapterId', requireRole(['SUPER_ADMIN', 'LEADER']), getUsersByChapter);

// Create user for chapter (SUPER_ADMIN only)
router.post('/chapter', requireRole(['SUPER_ADMIN']), validateCreateUserForChapter, createUserForChapter);

// Get user by ID
router.get('/:id', getUserById);

// Update user
router.put('/:id', validateUpdateUser, updateUser);

// Delete user (SUPER_ADMIN only)
router.delete('/:id', requireRole(['SUPER_ADMIN']), deleteUser);

export default router; 