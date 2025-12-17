import { Router, type Request, type Response } from 'express';
import passport from 'passport';
import * as authController from '../controllers/authController.js';
import { authRateLimit, registerRateLimit } from '../middlewares/rateLimiter.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';

const router = Router();

// Routes d'inscription et de connexion avec rate limiting
router.post('/register', registerRateLimit, authController.register);
router.post('/login', authRateLimit, authController.login);

// Route pour l'authentification en tant qu'invité
router.post('/guest', authController.guestLogin);

// Route pour obtenir les informations de l'utilisateur connecté
router.get('/me', isAuthenticated, authController.getMe);

// Routes pour la gestion du profil
router.put('/profile', isAuthenticated, authController.updateProfile);
router.put('/change-password', isAuthenticated, authController.changePassword);

// Déconnexion
router.post('/logout', authController.logout);

export default router;

