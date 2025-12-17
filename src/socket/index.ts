import { Server as SocketServer, type Socket } from 'socket.io';
import type { Server } from 'http';
import { RoomManager } from './RoomManager.js';
import { registerConnectionHandlers } from './handlers/connection.js';
import { registerRoomHandlers } from './handlers/room.js';
import { registerGameHandlers } from './handlers/game.js';
import { registerChatHandlers } from './handlers/chat.js';
import type { ClientToServerEvents, ServerToClientEvents } from '../core/types/events.js';

export type GameSocket = SocketServer<ClientToServerEvents, ServerToClientEvents>;

let io: GameSocket | null = null;

export function getIO(): GameSocket {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

export async function initializeSocketServer(httpServer: Server): Promise<void> {
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  
  io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Initialiser le RoomManager
  RoomManager.getInstance();

  // Gestion des connexions
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`Socket connecté: ${socket.id}`);

    // Enregistrer les handlers
    registerConnectionHandlers(socket);
    registerRoomHandlers(socket);
    registerGameHandlers(socket);
    registerChatHandlers(socket);
  });

  console.log('Socket.IO server initialized');
}

