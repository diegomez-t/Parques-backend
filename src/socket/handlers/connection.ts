import type { Socket } from 'socket.io';
import { RoomManager } from '../RoomManager.js';
import { getIO } from '../index.js';

/**
 * Handlers pour la connexion/déconnexion
 */
export function registerConnectionHandlers(socket: Socket): void {
  socket.on('disconnect', (reason) => {
    console.log(`Socket déconnecté: ${socket.id} - Raison: ${reason}`);

    const roomManager = RoomManager.getInstance();
    const room = roomManager.getPlayerRoom(socket.id);

    if (room) {
      const player = room.getPlayerBySocketId(socket.id);

      if (player) {
        // Notifier les autres joueurs
        const io = getIO();
        io.to(room.code).emit('room:player-left', player.id);

        // Si la partie n'est pas en cours, retirer le joueur
        if (!room.isGameInProgress) {
          roomManager.removePlayerFromRoom(socket.id);

          // Mettre à jour la room
          io.to(room.code).emit('room:updated', room.getState());
        } else {
          // Marquer comme déconnecté mais garder dans la partie
          player.setConnectionStatus('disconnected');

          // TODO: Démarrer un timer de reconnexion
        }
      }
    }
  });

  // Ping/Pong pour vérifier la connexion
  socket.on('ping', () => {
    socket.emit('pong');
  });
}

