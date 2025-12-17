import { Router, type Request, type Response } from 'express';
import { RoomManager } from '../socket/RoomManager.js';
import { isAuthenticated, optionalAuth } from '../middlewares/authMiddleware.js';

const router = Router();

/**
 * GET /api/games/rooms - Liste des rooms publiques
 */
router.get('/rooms', optionalAuth, (_req: Request, res: Response) => {
  const roomManager = RoomManager.getInstance();
  const publicRooms = roomManager.getPublicRooms();
  
  res.json({
    rooms: publicRooms.map(room => ({
      code: room.code,
      playerCount: room.playerCount,
      maxPlayers: room.settings.maxPlayers,
      host: room.host?.name,
      isGameInProgress: room.isGameInProgress,
    }))
  });
});

/**
 * GET /api/games/rooms/:code - Détails d'une room
 */
router.get('/rooms/:code', optionalAuth, (req: Request, res: Response) => {
  const roomManager = RoomManager.getInstance();
  const room = roomManager.getRoom(req.params.code);
  
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  
  res.json({
    code: room.code,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isReady: p.isReady,
    })),
    settings: room.settings,
    isGameInProgress: room.isGameInProgress,
  });
});

/**
 * GET /api/games/stats - Statistiques globales
 */
router.get('/stats', (_req: Request, res: Response) => {
  const roomManager = RoomManager.getInstance();
  
  res.json({
    activeRooms: roomManager.getRoomCount(),
    totalPlayers: roomManager.getTotalPlayerCount(),
    publicRooms: roomManager.getPublicRooms().length,
  });
});

export default router;

