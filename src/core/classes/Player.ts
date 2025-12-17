import { CONNECTION_STATUS, type ConnectionStatus } from '../constants.js';
import type { PlayerGameStats, PlayerJSON, PlayerState, RoundScore } from '../types/player.js';

export interface PlayerConfig {
  name: string;
  socketId: string;
  userId?: string;
  avatar?: string;
  isGuest?: boolean;
}

/**
 * Classe représentant un joueur dans une partie
 */
export class Player implements PlayerState {
  readonly id: string;
  name: string;
  avatar?: string;
  userId?: string;
  isGuest: boolean;

  socketId: string;
  connectionStatus: ConnectionStatus;
  isHost: boolean;
  isReady: boolean;
  score: number;
  turnOrder: number;
  stats: PlayerGameStats;
  gameData: Record<string, unknown>;

  private _scores: RoundScore[] = [];
  private _turnStartTime: number | null = null;
  private _afkWarningShown: boolean = false;

  constructor(config: PlayerConfig) {
    this.id = crypto.randomUUID();
    this.name = config.name;
    this.socketId = config.socketId;
    this.userId = config.userId;
    this.avatar = config.avatar;
    this.isGuest = config.isGuest ?? true;

    this.connectionStatus = CONNECTION_STATUS.CONNECTED;
    this.isHost = false;
    this.isReady = false;
    this.score = 0;
    this.turnOrder = 0;
    this.gameData = {};
    this.stats = this.createEmptyStats();
  }

  /**
   * Scores par manche
   */
  get scores(): RoundScore[] {
    return this._scores;
  }

  /**
   * Est-ce le tour du joueur?
   */
  get turnStartTime(): number | null {
    return this._turnStartTime;
  }

  /**
   * Crée des stats vides
   */
  private createEmptyStats(): PlayerGameStats {
    return {
      cardsPlayed: 0,
      cardsDrawn: 0,
      turnsPlayed: 0,
      timeSpent: 0,
      afkCount: 0,
    };
  }

  /**
   * Démarre le tour du joueur
   */
  startTurn(): void {
    this._turnStartTime = Date.now();
    this._afkWarningShown = false;
  }

  /**
   * Termine le tour du joueur
   */
  endTurn(): void {
    if (this._turnStartTime) {
      this.stats.timeSpent += Date.now() - this._turnStartTime;
      this.stats.turnsPlayed++;
    }
    this._turnStartTime = null;
    this._afkWarningShown = false;
  }

  /**
   * Marque le joueur comme AFK
   */
  markAfk(): void {
    this.stats.afkCount++;
  }

  /**
   * Ajoute un score de manche
   */
  addRoundScore(score: RoundScore): void {
    this._scores.push(score);
    if (typeof score === 'number') {
      this.score += score;
    } else if (typeof score === 'object') {
      this.score += score.score;
    }
  }

  /**
   * Recalcule le score total
   */
  recalculateScore(): void {
    let total = 0;
    for (const s of this._scores) {
      if (typeof s === 'number') {
        total += s;
      } else if (typeof s === 'object' && s !== null && 'score' in s) {
        total += s.score;
      }
    }
    this.score = total;
  }

  /**
   * Définit le statut de connexion
   */
  setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
  }

  /**
   * Met à jour le socket ID
   */
  updateSocketId(socketId: string): void {
    this.socketId = socketId;
  }

  /**
   * Réinitialise pour une nouvelle partie
   */
  resetForNewGame(): void {
    this._scores = [];
    this.score = 0;
    this.isReady = false;
    this._turnStartTime = null;
    this._afkWarningShown = false;
    this.gameData = {};
    this.stats = this.createEmptyStats();
  }

  /**
   * Réinitialise pour une nouvelle manche
   */
  resetForNewRound(): void {
    this._turnStartTime = null;
    this._afkWarningShown = false;
    this.gameData = {};
  }

  /**
   * Sérialise le joueur pour le client
   */
  toJSON(): PlayerJSON {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      score: this.score,
      connectionStatus: this.connectionStatus,
      isHost: this.isHost,
      isReady: this.isReady,
      turnOrder: this.turnOrder,
    };
  }

  /**
   * Sérialise l'état complet (pour le serveur)
   */
  toFullState(): PlayerState {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      userId: this.userId,
      isGuest: this.isGuest,
      socketId: this.socketId,
      connectionStatus: this.connectionStatus,
      isHost: this.isHost,
      isReady: this.isReady,
      score: this.score,
      turnOrder: this.turnOrder,
      stats: { ...this.stats },
      gameData: { ...this.gameData },
    };
  }

  /**
   * Crée un joueur depuis des données
   */
  static fromState(state: PlayerState): Player {
    const player = new Player({
      name: state.name,
      socketId: state.socketId,
      userId: state.userId,
      avatar: state.avatar,
      isGuest: state.isGuest,
    });
    (player as { id: string }).id = state.id;
    player.connectionStatus = state.connectionStatus;
    player.isHost = state.isHost;
    player.isReady = state.isReady;
    player.score = state.score;
    player.turnOrder = state.turnOrder;
    player.stats = { ...state.stats };
    player.gameData = { ...state.gameData };
    return player;
  }
}

