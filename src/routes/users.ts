import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const router = Router();

// Routes protégées
router.get('/profile', isAuthenticated, userController.getProfile);
router.put('/profile', isAuthenticated, userController.updateProfile);
router.get('/stats', isAuthenticated, userController.getStats);

// Routes publiques
router.get('/:id', userController.getUserById);
router.get('/:id/stats', userController.getUserStats);

export default router;

