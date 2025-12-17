import { Router, type Request, type Response } from 'express';
import { RoomManager } from '../socket/RoomManager.js';

const router = Router();

// Page d'accueil / Status
router.get('/', (_req: Request, res: Response) => {
  const roomManager = RoomManager.getInstance();
  
  res.json({
    name: 'Parqués Colombien API',
    version: '1.0.0',
    status: 'running',
    stats: {
      activeRooms: roomManager.getRoomCount(),
      totalPlayers: roomManager.getTotalPlayerCount(),
    },
    endpoints: {
      health: '/health',
      auth: '/auth',
      users: '/api/users',
      games: '/api/games',
    }
  });
});

export default router;

