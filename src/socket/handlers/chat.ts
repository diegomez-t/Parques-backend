import type { Socket } from 'socket.io';
import { chatMessageSchema, validate } from '../../shared/validations/index.js';
import { RoomManager } from '../RoomManager.js';
import { getIO } from '../index.js';

/**
 * Handlers pour le chat
 */
export function registerChatHandlers(socket: Socket): void {
  const roomManager = RoomManager.getInstance();
  const io = getIO();

  /**
   * Envoyer un message
   */
  socket.on('chat:message', (message) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room) return;

    const player = room.getPlayerBySocketId(socket.id);
    if (!player) return;

    // Valider le message
    const validation = validate(chatMessageSchema, message);
    if (!validation.success) return;

    const cleanMessage = validation.data;

    // Envoyer à tous les joueurs de la room
    io.to(room.code).emit('chat:message', {
      playerId: player.id,
      playerName: player.name,
      message: cleanMessage,
      timestamp: Date.now(),
    });
  });
}

