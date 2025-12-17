import {
  CONNECTION_STATUS,
  DEFAULT_SETTINGS,
  GAME_PHASE,
  GAME_STATUS,
  type GamePhase,
  type GameStatus,
} from '../constants.js';
import type { CreateGameOptions, GameAction, GameSettings, GameState } from '../types/game.js';
import { Player } from './Player.js';

export interface GameConfig {
  minPlayers?: number;
  maxPlayers?: number;
  turnTimeoutMs?: number;
  isPrivate?: boolean;
}

/**
 * Classe de base pour un jeu multijoueur
 */
export abstract class Game {
  readonly id: string;
  readonly code: string;
  protected _status: GameStatus;
  protected _phase: GamePhase;
  protected _hostId: string;
  protected _currentPlayerId: string | null;
  protected _players: Map<string, Player>;
  protected _settings: GameSettings;
  protected _roundNumber: number;
  protected _turnNumber: number;
  protected _actionHistory: GameAction[];
  protected _gameData: Record<string, unknown>;

  protected _createdAt: Date;
  protected _updatedAt: Date;
  protected _startedAt: Date | null;
  protected _endedAt: Date | null;

  constructor(options: CreateGameOptions, config: GameConfig = {}) {
    this.id = crypto.randomUUID();
    this.code = this.generateRoomCode();
    this._hostId = options.hostId;
    this._status = GAME_STATUS.LOBBY;
    this._phase = GAME_PHASE.SETUP;
    this._currentPlayerId = null;
    this._players = new Map();
    this._roundNumber = 0;
    this._turnNumber = 0;
    this._actionHistory = [];
    this._gameData = {};

    this._settings = {
      minPlayers: config.minPlayers ?? DEFAULT_SETTINGS.MIN_PLAYERS,
      maxPlayers: config.maxPlayers ?? DEFAULT_SETTINGS.MAX_PLAYERS,
      turnTimeoutMs: config.turnTimeoutMs ?? DEFAULT_SETTINGS.TURN_TIMEOUT_MS,
      reconnectTimeoutMs: DEFAULT_SETTINGS.RECONNECT_TIMEOUT_MS,
      isPrivate: config.isPrivate ?? false,
      ...options.settings,
    };

    const now = new Date();
    this._createdAt = now;
    this._updatedAt = now;
    this._startedAt = null;
    this._endedAt = null;
  }

  // Getters
  get status(): GameStatus {
    return this._status;
  }
  get phase(): GamePhase {
    return this._phase;
  }
  get hostId(): string {
    return this._hostId;
  }
  get currentPlayerId(): string | null {
    return this._currentPlayerId;
  }
  get settings(): GameSettings {
    return this._settings;
  }
  get roundNumber(): number {
    return this._roundNumber;
  }
  get turnNumber(): number {
    return this._turnNumber;
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  get players(): Player[] {
    return Array.from(this._players.values());
  }

  get connectedPlayers(): Player[] {
    return this.players.filter((p) => p.connectionStatus === CONNECTION_STATUS.CONNECTED);
  }

  get playerCount(): number {
    return this._players.size;
  }

  get isFull(): boolean {
    return this.connectedPlayers.length >= this._settings.maxPlayers;
  }

  get canStart(): boolean {
    const connected = this.connectedPlayers;
    return (
      connected.length >= this._settings.minPlayers &&
      connected.every((p) => p.isReady || p.isHost) &&
      this._status === GAME_STATUS.LOBBY
    );
  }

  get currentPlayer(): Player | undefined {
    return this._currentPlayerId ? this._players.get(this._currentPlayerId) : undefined;
  }

  addPlayer(player: Player): boolean {
    if (this.isFull) return false;
    if (this._status !== GAME_STATUS.LOBBY) return false;

    player.turnOrder = this.playerCount;
    if (this.playerCount === 0 || player.id === this._hostId) {
      player.isHost = true;
      this._hostId = player.id;
    }

    this._players.set(player.id, player);
    this._updatedAt = new Date();
    return true;
  }

  removePlayer(playerId: string): boolean {
    const player = this._players.get(playerId);
    if (!player) return false;

    if (this._status === GAME_STATUS.LOBBY) {
      this._players.delete(playerId);
    } else {
      player.setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
    }

    if (player.isHost) {
      this.transferHost();
    }

    this._updatedAt = new Date();
    return true;
  }

  transferHost(newHostId?: string): boolean {
    const connected = this.connectedPlayers.filter((p) => p.id !== this._hostId);
    if (connected.length === 0) return false;

    const currentHost = this._players.get(this._hostId);
    if (currentHost) currentHost.isHost = false;

    const newHost = newHostId ? this._players.get(newHostId) : connected[0];
    if (!newHost) return false;

    newHost.isHost = true;
    this._hostId = newHost.id;
    this._updatedAt = new Date();
    return true;
  }

  getPlayer(playerId: string): Player | undefined {
    return this._players.get(playerId);
  }

  getPlayerBySocketId(socketId: string): Player | undefined {
    return this.players.find((p) => p.socketId === socketId);
  }

  updateSettings(settings: Partial<GameSettings>): void {
    if (this._status !== GAME_STATUS.LOBBY) return;
    this._settings = { ...this._settings, ...settings };
    this._updatedAt = new Date();
  }

  async start(): Promise<boolean> {
    if (!this.canStart) return false;

    this._status = GAME_STATUS.STARTING;
    this._startedAt = new Date();
    this._roundNumber = 1;
    this._turnNumber = 0;
    this._updatedAt = new Date();

    for (const player of this.players) {
      player.resetForNewGame();
    }

    await this.initializeGame();

    this._status = GAME_STATUS.PLAYING;
    this._phase = GAME_PHASE.PLAY;

    this.selectFirstPlayer();

    return true;
  }

  protected selectFirstPlayer(): void {
    const connected = this.connectedPlayers;
    if (connected.length === 0) return;

    const randomIndex = Math.floor(Math.random() * connected.length);
    this._currentPlayerId = connected[randomIndex]!.id;
    this.currentPlayer?.startTurn();
  }

  protected nextPlayer(): void {
    const connected = this.connectedPlayers.sort((a, b) => a.turnOrder - b.turnOrder);
    if (connected.length === 0) return;

    const currentIndex = connected.findIndex((p) => p.id === this._currentPlayerId);
    const nextIndex = (currentIndex + 1) % connected.length;
    this._currentPlayerId = connected[nextIndex]!.id;
    this._turnNumber++;

    this.currentPlayer?.startTurn();
  }

  protected endCurrentTurn(): void {
    this.currentPlayer?.endTurn();
    this.nextPlayer();
    this._updatedAt = new Date();
  }

  async end(reason: 'completed' | 'forfeit' | 'timeout' | 'cancelled' = 'completed'): Promise<void> {
    this._status = GAME_STATUS.FINISHED;
    this._phase = GAME_PHASE.END_GAME;
    this._endedAt = new Date();
    this._updatedAt = new Date();

    await this.onGameEnd(reason);
  }

  getState(): GameState {
    return {
      id: this.id,
      code: this.code,
      status: this._status,
      phase: this._phase,
      hostId: this._hostId,
      currentPlayerId: this._currentPlayerId,
      players: this.players.map((p) => p.toFullState()),
      settings: { ...this._settings },
      roundNumber: this._roundNumber,
      turnNumber: this._turnNumber,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      startedAt: this._startedAt,
      endedAt: this._endedAt,
      gameData: { ...this._gameData },
    };
  }

  protected recordAction(playerId: string, type: string, data: Record<string, unknown>): void {
    this._actionHistory.push({
      id: crypto.randomUUID(),
      gameId: this.id,
      playerId,
      type,
      data,
      timestamp: new Date(),
    });
  }

  // Méthodes abstraites à implémenter dans les sous-classes
  abstract initializeGame(): Promise<void>;
  abstract handleAction(playerId: string, action: string, data: Record<string, unknown>): Promise<boolean>;
  abstract getValidActions(playerId: string): string[];
  abstract onGameEnd(reason: string): Promise<void>;
  abstract calculateScores(): void;
}

