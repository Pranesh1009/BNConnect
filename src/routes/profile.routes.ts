import express from 'express';
import { createProfile, getProfile, updateProfile, deleteProfile } from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateProfile, createProfileSchema, updateProfileSchema } from '../validations/profile.validation';

const router = express.Router();

// All profile routes require authentication
router.use(authenticate);

// Profile CRUD routes
router.post('/', validateProfile(createProfileSchema), createProfile);
router.get('/', getProfile);
router.put('/', validateProfile(updateProfileSchema), updateProfile);
router.delete('/', deleteProfile);

export default router; 