import type { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter pour l'authentification (login/register)
const authLimiter = new RateLimiterMemory({
  keyPrefix: 'auth',
  points: 5, // 5 tentatives
  duration: 60, // par minute
  blockDuration: 60 * 15, // blocage de 15 minutes
});

// Rate limiter pour l'inscription
const registerLimiter = new RateLimiterMemory({
  keyPrefix: 'register',
  points: 3, // 3 inscriptions
  duration: 60 * 60, // par heure
  blockDuration: 60 * 60, // blocage d'1 heure
});

/**
 * Middleware de rate limiting pour l'authentification
 */
export async function authRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const key = req.ip || 'unknown';
    await authLimiter.consume(key);
    next();
  } catch (error: any) {
    const retryAfter = Math.ceil(error.msBeforeNext / 1000) || 60;
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      error: 'Too many attempts',
      retryAfter,
    });
  }
}

/**
 * Middleware de rate limiting pour l'inscription
 */
export async function registerRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const key = req.ip || 'unknown';
    await registerLimiter.consume(key);
    next();
  } catch (error: any) {
    const retryAfter = Math.ceil(error.msBeforeNext / 1000) || 3600;
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      error: 'Too many registration attempts',
      retryAfter,
    });
  }
}

