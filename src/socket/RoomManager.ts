import { GameRoom } from '../core/classes/GameRoom.js';
import { Player } from '../core/classes/Player.js';
import { DEFAULT_SETTINGS } from '../shared/constants.js';
import type { Game } from '../core/classes/Game.js';
import type { GameSettings } from '../core/types/game.js';

/**
 * Gestionnaire centralisé des rooms de jeu
 */
export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, GameRoom<Game>> = new Map();
  private playerRooms: Map<string, string> = new Map(); // socketId -> roomCode

  private constructor() {}

  static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /**
   * Crée une nouvelle room
   */
  createRoom(settings?: Partial<GameSettings>): GameRoom<Game> {
    const code = this.generateUniqueCode();
    const defaultSettings: GameSettings = {
      minPlayers: DEFAULT_SETTINGS.MIN_PLAYERS,
      maxPlayers: DEFAULT_SETTINGS.MAX_PLAYERS,
      turnTimeoutMs: DEFAULT_SETTINGS.TURN_TIMEOUT_MS,
      reconnectTimeoutMs: DEFAULT_SETTINGS.RECONNECT_TIMEOUT_MS,
      isPrivate: false,
      ...settings,
    };

    const room = new GameRoom<Game>(code, defaultSettings);
    this.rooms.set(code, room);

    console.log(`Room créée: ${code}`);
    return room;
  }

  /**
   * Récupère une room par code
   */
  getRoom(code: string): GameRoom<Game> | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  /**
   * Récupère la room d'un joueur
   */
  getPlayerRoom(socketId: string): GameRoom<Game> | undefined {
    const code = this.playerRooms.get(socketId);
    return code ? this.getRoom(code) : undefined;
  }

  /**
   * Ajoute un joueur à une room
   */
  addPlayerToRoom(roomCode: string, player: Player): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;

    const added = room.addPlayer(player);
    if (added) {
      this.playerRooms.set(player.socketId, roomCode);
    }
    return added;
  }

  /**
   * Retire un joueur d'une room
   */
  removePlayerFromRoom(socketId: string): void {
    const roomCode = this.playerRooms.get(socketId);
    if (!roomCode) return;

    const room = this.getRoom(roomCode);
    if (!room) return;

    const player = room.getPlayerBySocketId(socketId);
    if (player) {
      room.removePlayer(player.id);
    }

    this.playerRooms.delete(socketId);

    // Supprimer la room si elle est vide
    if (room.isEmpty) {
      this.deleteRoom(roomCode);
    }
  }

  /**
   * Supprime une room
   */
  deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;

    // Nettoyer les références des joueurs
    for (const player of room.players) {
      this.playerRooms.delete(player.socketId);
    }

    this.rooms.delete(code);
    console.log(`Room supprimée: ${code}`);
  }

  /**
   * Nombre de rooms actives
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Nombre total de joueurs
   */
  getTotalPlayerCount(): number {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += room.playerCount;
    }
    return count;
  }

  /**
   * Liste des rooms publiques
   */
  getPublicRooms(): GameRoom<Game>[] {
    return Array.from(this.rooms.values()).filter(
      (room) => !room.settings.isPrivate && !room.isGameInProgress
    );
  }

  /**
   * Génère un code unique
   */
  private generateUniqueCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;

    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));

    return code;
  }

  /**
   * Nettoie les rooms inactives (à appeler périodiquement)
   */
  cleanupInactiveRooms(maxIdleMinutes = 30): number {
    let cleaned = 0;

    for (const [code, room] of this.rooms.entries()) {
      if (room.isEmpty) {
        this.deleteRoom(code);
        cleaned++;
      }
    }

    return cleaned;
  }
}

