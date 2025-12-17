import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { validate, signupSchema, loginSchema, updateProfileSchema } from '../shared/validations/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'parques-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Générer un token JWT
 */
function generateToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * POST /auth/register - Inscription
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const validation = validate(signupSchema, req.body);
    
    if (!validation.success) {
      res.status(400).json({ error: 'Validation error', details: validation.errors });
      return;
    }

    const { username, email, password } = validation.data;

    // Vérifier si l'utilisateur existe
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      res.status(409).json({ 
        error: existingUser.email === email ? 'Email already taken' : 'Username already taken' 
      });
      return;
    }

    // Hasher le mot de passe
    const passwordHash = await argon2.hash(password);

    // Créer l'utilisateur
    const user = await User.create({
      username,
      email,
      passwordHash,
    });

    const token = generateToken(user._id.toString());

    res.status(201).json({
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /auth/login - Connexion
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const validation = validate(loginSchema, req.body);
    
    if (!validation.success) {
      res.status(400).json({ error: 'Validation error', details: validation.errors });
      return;
    }

    const { email, password } = validation.data;

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Mettre à jour la dernière connexion
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id.toString());

    res.json({
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /auth/guest - Connexion en tant qu'invité
 */
export async function guestLogin(req: Request, res: Response): Promise<void> {
  try {
    const { username } = req.body;

    if (!username || username.length < 2) {
      res.status(400).json({ error: 'Username required (min 2 characters)' });
      return;
    }

    // Créer un utilisateur invité temporaire
    const guestId = crypto.randomUUID();

    res.json({
      guest: {
        id: guestId,
        username,
        isGuest: true,
      },
    });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /auth/me - Informations de l'utilisateur connecté
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;
    res.json({ user });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /auth/profile - Mise à jour du profil
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const validation = validate(updateProfileSchema, req.body);
    
    if (!validation.success) {
      res.status(400).json({ error: 'Validation error', details: validation.errors });
      return;
    }

    const userId = (req as any).user._id;
    const updates = validation.data;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );

    res.json({ user });
  } catch (error) {
    console.error('UpdateProfile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /auth/change-password - Changement de mot de passe
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user._id;

    const user = await User.findById(userId).select('+passwordHash');
    if (!user || !user.passwordHash) {
      res.status(400).json({ error: 'Cannot change password for this account' });
      return;
    }

    const isValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isValid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    user.passwordHash = await argon2.hash(newPassword);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('ChangePassword error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /auth/logout - Déconnexion
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.json({ success: true });
}

