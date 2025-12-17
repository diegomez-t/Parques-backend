import type { Socket } from 'socket.io';
import { gameActionSchema, validate } from '../../shared/validations/index.js';
import { RoomManager } from '../RoomManager.js';
import { getIO } from '../index.js';
import { ParquesGame } from '../../core/classes/ParquesGame.js';

/**
 * Handlers pour le jeu
 */
export function registerGameHandlers(socket: Socket): void {
  const roomManager = RoomManager.getInstance();
  const io = getIO();

  /**
   * Démarrer la partie (hôte uniquement)
   */
  socket.on('game:start', async () => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room) {
      socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in a room' });
      return;
    }

    const player = room.getPlayerBySocketId(socket.id);
    if (!player || !player.isHost) {
      socket.emit('error', { code: 'NOT_HOST', message: 'Only host can start' });
      return;
    }

    // Vérifier que tous sont prêts
    if (!room.allPlayersReady()) {
      socket.emit('error', { code: 'NOT_READY', message: 'Not all players ready' });
      return;
    }

    // Vérifier le nombre de joueurs
    if (room.playerCount < room.settings.minPlayers) {
      socket.emit('error', { code: 'NOT_ENOUGH_PLAYERS', message: 'Not enough players' });
      return;
    }

    try {
      // Créer une instance du jeu Parqués
      const game = new ParquesGame(
        { hostId: player.id },
        { 
          boardType: 4,
          pawnsPerPlayer: 4,
        }
      );

      // Ajouter tous les joueurs au jeu
      for (const p of room.players) {
        game.addPlayer(p);
      }

      // Démarrer le jeu
      const started = await game.start();
      if (!started) {
        socket.emit('error', { code: 'START_ERROR', message: 'Could not start game' });
        return;
      }

      // Associer le jeu à la room
      room.setGame(game as any);

      console.log(`Partie démarrée dans ${room.code}`);

      // Notifier tous les joueurs
      io.to(room.code).emit('game:started', game.getState() as any);

      // Notifier le premier joueur
      const currentPlayer = game.currentPlayer;
      if (currentPlayer) {
        io.to(room.code).emit('turn:start', {
          playerId: currentPlayer.id,
          timeoutMs: game.settings.turnTimeoutMs,
          validActions: game.getValidActions(currentPlayer.id),
        });
      }
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', { code: 'START_ERROR', message: 'Could not start game' });
    }
  });

  /**
   * Action de jeu
   */
  socket.on('game:action', async (data, callback) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room) {
      return callback({ success: false, error: 'Not in a room' });
    }

    const game = room.game;
    if (!game) {
      return callback({ success: false, error: 'Game not started' });
    }

    const player = room.getPlayerBySocketId(socket.id);
    if (!player) {
      return callback({ success: false, error: 'Player not found' });
    }

    // Valider l'action
    const validation = validate(gameActionSchema, data);
    if (!validation.success) {
      return callback({ success: false, error: 'Invalid action data' });
    }

    const { type, data: actionData } = validation.data;

    // Debug logs
    console.log('=== Game Action Debug ===');
    console.log('Player ID from room:', player.id);
    console.log('Current player ID in game:', game.currentPlayerId);
    console.log('Action type:', type);
    console.log('Valid actions:', game.getValidActions(player.id));
    console.log('Game status:', game.status);
    console.log('=========================');

    // Vérifier que c'est le tour du joueur
    if (game.currentPlayerId !== player.id) {
      console.log('Rejected: Not player turn');
      return callback({ success: false, error: 'Not your turn' });
    }

    // Vérifier que l'action est valide
    const validActions = game.getValidActions(player.id);
    if (!validActions.includes(type)) {
      console.log('Rejected: Invalid action. Expected one of:', validActions);
      return callback({ success: false, error: 'Invalid action' });
    }

    try {
      // Exécuter l'action
      const success = await game.handleAction(player.id, type, actionData);

      if (!success) {
        return callback({ success: false, error: 'Action failed' });
      }

      callback({ success: true });

      // Notifier tous les joueurs de l'action
      io.to(room.code).emit('game:action', {
        playerId: player.id,
        type,
        data: actionData,
        timestamp: Date.now(),
      });

      // Mettre à jour l'état du jeu
      const gameState = game.getState();
      io.to(room.code).emit('game:state', gameState);

      // Vérifier si la partie est terminée
      if (game.status === 'finished') {
        // Trouver le gagnant
        const winner = game.players.find(p => {
          const pawns = (gameState.gameData as any)?.pawns?.[p.id] || [];
          return pawns.every((pawn: any) => pawn.inCielo);
        });

        io.to(room.code).emit('game:ended', {
          winnerId: winner?.id || null,
          rankings: game.players.map((p, i) => ({
            playerId: p.id,
            rank: i + 1,
            score: p.score,
          })),
          stats: {},
        });
      } else {
        // Notifier du prochain tour
        const currentPlayer = game.currentPlayer;
        if (currentPlayer) {
          io.to(room.code).emit('turn:start', {
            playerId: currentPlayer.id,
            timeoutMs: game.settings.turnTimeoutMs,
            validActions: game.getValidActions(currentPlayer.id),
          });
        }
      }
    } catch (error) {
      console.error('Error handling action:', error);
      callback({ success: false, error: 'Action error' });
    }
  });

  /**
   * Transférer l'hôte
   */
  socket.on('player:transfer-host', (targetPlayerId) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room) return;

    const player = room.getPlayerBySocketId(socket.id);
    if (!player || !player.isHost) return;

    const targetPlayer = room.getPlayer(targetPlayerId);
    if (!targetPlayer) return;

    player.isHost = false;
    targetPlayer.isHost = true;

    io.to(room.code).emit('room:updated', room.getState());
    io.to(room.code).emit('chat:system', `${targetPlayer.name} est maintenant l'hôte`);
  });

  /**
   * Expulser un joueur (hôte uniquement)
   */
  socket.on('player:kick', (targetPlayerId) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room) return;

    const player = room.getPlayerBySocketId(socket.id);
    if (!player || !player.isHost) return;

    const targetPlayer = room.getPlayer(targetPlayerId);
    if (!targetPlayer || targetPlayer.isHost) return;

    // Retirer le joueur
    room.removePlayer(targetPlayerId);
    roomManager.removePlayerFromRoom(targetPlayer.socketId);

    // Notifier
    io.to(room.code).emit('room:player-left', targetPlayerId);
    io.to(room.code).emit('room:updated', room.getState());
    io.to(targetPlayer.socketId).emit('room:closed', 'You were kicked');
  });
}

