import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';

import configurePassport from './config/passport.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import gameRoutes from './routes/game.js';
import indexRoutes from './routes/index.js';

// Configuration des origines autorisées pour CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.CORS_ORIGIN,
].filter(Boolean) as string[];

async function createApp(): Promise<Express> {
  const app = express();
  console.log('🛠️  Création de l\'application Express...');

  // Configuration CORS
  app.use(cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
      }
    },
    credentials: true,
  }));

  // Middlewares Express
  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Configuration de la session
  app.use(session({
    secret: process.env.SESSION_SECRET || 'parques-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 // 1 jour
    }
  }));

  // Configuration de Passport.js
  app.use(passport.initialize());
  configurePassport(passport);
  console.log('✅ Passport.js est configuré.');

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'parques-backend'
    });
  });

  // Montage des routes
  app.use('/', indexRoutes);
  app.use('/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/games', gameRoutes);

  console.log('✅ Routes montées.');

  // Gestion des erreurs 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // Gestion globale des erreurs
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  return app;
}

export default createApp;

