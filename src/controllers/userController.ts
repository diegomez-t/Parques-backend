import type { Request, Response } from 'express';
import { User } from '../models/User.js';
import { validate, updateProfileSchema } from '../shared/validations/index.js';

/**
 * GET /api/users/profile - Profil de l'utilisateur connecté
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('GetProfile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/users/profile - Mise à jour du profil
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const validation = validate(updateProfileSchema, req.body);
    
    if (!validation.success) {
      res.status(400).json({ error: 'Validation error', details: validation.errors });
      return;
    }

    const userId = (req as any).user._id;
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: validation.data },
      { new: true }
    );

    res.json({ user });
  } catch (error) {
    console.error('UpdateProfile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/users/stats - Statistiques de l'utilisateur connecté
 */
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ stats: user.stats });
  } catch (error) {
    console.error('GetStats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/users/:id - Profil public d'un utilisateur
 */
export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Retourner uniquement les informations publiques
    res.json({
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        stats: {
          gamesPlayed: user.stats.gamesPlayed,
          gamesWon: user.stats.gamesWon,
        }
      }
    });
  } catch (error) {
    console.error('GetUserById error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/users/:id/stats - Statistiques publiques d'un utilisateur
 */
export async function getUserStats(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      stats: {
        gamesPlayed: user.stats.gamesPlayed,
        gamesWon: user.stats.gamesWon,
        winRate: user.stats.gamesPlayed > 0 
          ? Math.round((user.stats.gamesWon / user.stats.gamesPlayed) * 100) 
          : 0,
      }
    });
  } catch (error) {
    console.error('GetUserStats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

