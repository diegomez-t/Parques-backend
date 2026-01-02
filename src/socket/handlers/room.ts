import type { Socket } from 'socket.io';
import { Player } from '../../core/classes/Player.js';
import { createRoomSchema, joinRoomSchema, validate } from '../../shared/validations/index.js';
import { RoomManager } from '../RoomManager.js';
import { getIO } from '../index.js';

/**
 * Handlers pour les rooms
 */
export function registerRoomHandlers(socket: Socket): void {
  const roomManager = RoomManager.getInstance();
  const io = getIO();

  /**
   * Créer une room
   */
  socket.on('room:create', (data, callback) => {
    const validation = validate(createRoomSchema, data);

    if (!validation.success) {
      return callback({ success: false, error: 'Validation error' });
    }

    const { playerName, avatar, settings } = validation.data;

    // Créer la room
    const room = roomManager.createRoom(settings);

    // Créer le joueur hôte
    const player = new Player({
      name: playerName,
      socketId: socket.id,
      avatar,
    });

    // Ajouter le joueur à la room
    roomManager.addPlayerToRoom(room.code, player);

    // Rejoindre la room Socket.IO
    socket.join(room.code);

    console.log(`Room ${room.code} créée par ${playerName}`);

    callback({ success: true, roomCode: room.code });

    // Notifier (utile pour le créateur aussi)
    io.to(room.code).emit('room:updated', room.getState());
  });

  /**
   * Rejoindre une room
   */
  socket.on('room:join', (data, callback) => {
    const validation = validate(joinRoomSchema, data);

    if (!validation.success) {
      return callback({ success: false, error: 'Validation error' });
    }

    const { roomCode, playerName, avatar } = validation.data;

    // Vérifier que la room existe
    const room = roomManager.getRoom(roomCode);
    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    // Vérifier que la room n'est pas pleine (max 4 joueurs)
    if (room.isFull || room.playerCount >= 4) {
      return callback({ success: false, error: 'Room is full (max 4 players)' });
    }

    // Vérifier que le jeu n'est pas en cours
    if (room.isGameInProgress) {
      return callback({ success: false, error: 'Game already started' });
    }

    // Créer le joueur
    const player = new Player({
      name: playerName,
      socketId: socket.id,
      avatar,
    });

    // Ajouter le joueur
    const added = roomManager.addPlayerToRoom(roomCode, player);
    if (!added) {
      return callback({ success: false, error: 'Could not join room' });
    }

    // Rejoindre la room Socket.IO
    socket.join(roomCode);

    console.log(`${playerName} a rejoint ${roomCode}`);

    callback({ success: true, roomCode });

    // Notifier les autres joueurs
    io.to(roomCode).emit('room:player-joined', player.toFullState());
    io.to(roomCode).emit('room:updated', room.getState());
  });

  /**
   * Quitter une room
   */
  socket.on('room:leave', () => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room) return;

    const player = room.getPlayerBySocketId(socket.id);
    if (!player) return;

    // Quitter la room Socket.IO
    socket.leave(room.code);

    // Retirer le joueur
    roomManager.removePlayerFromRoom(socket.id);

    console.log(`${player.name} a quitté ${room.code}`);

    // Notifier les autres
    io.to(room.code).emit('room:player-left', player.id);

    if (!room.isEmpty) {
      io.to(room.code).emit('room:updated', room.getState());
    }
  });

  /**
   * Mettre à jour les paramètres (hôte uniquement)
   */
  socket.on('room:settings', (settings) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room) return;

    const player = room.getPlayerBySocketId(socket.id);
    if (!player || !player.isHost) return;

    room.updateSettings(settings);

    io.to(room.code).emit('room:updated', room.getState());
  });

  /**
   * Se marquer comme prêt
   */
  socket.on('game:ready', (isReady) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room) return;

    const player = room.getPlayerBySocketId(socket.id);
    if (!player) return;

    player.isReady = isReady;

    io.to(room.code).emit('room:updated', room.getState());
  });
}

