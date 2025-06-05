import { Router } from 'express';
import {
  createChapter,
  getAllChapters,
  getChapterById,
  updateChapter,
  deleteChapter,
  getStates,
  getCities
} from '../controllers/chapter.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// States and Cities routes
router.get('/states', getStates);
router.get('/cities', getCities);

// Chapter CRUD routes
router.post('/', createChapter);
router.get('/', getAllChapters);
router.get('/:id', getChapterById);
router.put('/:id', updateChapter);
router.delete('/:id', deleteChapter);

export default router; 