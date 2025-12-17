import type { GameSettings } from '../types/game.js';
import type { RoomState } from '../types/events.js';
import type { Game } from './Game.js';
import type { Player } from './Player.js';

/**
 * Gestionnaire de room pour les parties
 */
export class GameRoom<TGame extends Game> {
  readonly code: string;
  private _game: TGame | null = null;
  private _players: Map<string, Player> = new Map();
  private _hostId: string | null = null;
  private _createdAt: Date;
  private _settings: GameSettings;

  constructor(code: string, defaultSettings: GameSettings) {
    this.code = code;
    this._createdAt = new Date();
    this._settings = defaultSettings;
  }

  get game(): TGame | null {
    return this._game;
  }

  get players(): Player[] {
    return Array.from(this._players.values());
  }

  get playerCount(): number {
    return this._players.size;
  }

  get hostId(): string | null {
    return this._hostId;
  }

  get host(): Player | undefined {
    return this._hostId ? this._players.get(this._hostId) : undefined;
  }

  get settings(): GameSettings {
    return this._settings;
  }

  get isFull(): boolean {
    return this.playerCount >= this._settings.maxPlayers;
  }

  get isEmpty(): boolean {
    return this.playerCount === 0;
  }

  get isGameInProgress(): boolean {
    return this._game !== null && this._game.status === 'playing';
  }

  /**
   * Ajoute un joueur à la room
   */
  addPlayer(player: Player): boolean {
    if (this.isFull) return false;
    if (this._players.has(player.id)) return false;

    this._players.set(player.id, player);

    // Premier joueur devient l'hôte
    if (this.playerCount === 1) {
      this._hostId = player.id;
      player.isHost = true;
    }

    return true;
  }

  /**
   * Retire un joueur de la room
   */
  removePlayer(playerId: string): boolean {
    const player = this._players.get(playerId);
    if (!player) return false;

    this._players.delete(playerId);

    // Transfert de l'hôte si nécessaire
    if (player.isHost && this.playerCount > 0) {
      const newHost = this.players[0];
      if (newHost) {
        newHost.isHost = true;
        this._hostId = newHost.id;
      }
    }

    return true;
  }

  /**
   * Récupère un joueur
   */
  getPlayer(playerId: string): Player | undefined {
    return this._players.get(playerId);
  }

  /**
   * Récupère un joueur par socket ID
   */
  getPlayerBySocketId(socketId: string): Player | undefined {
    return this.players.find((p) => p.socketId === socketId);
  }

  /**
   * Met à jour les paramètres
   */
  updateSettings(settings: Partial<GameSettings>): void {
    this._settings = { ...this._settings, ...settings };
  }

  /**
   * Définit la partie
   */
  setGame(game: TGame): void {
    this._game = game;
  }

  /**
   * Termine la partie
   */
  endGame(): void {
    this._game = null;
    for (const player of this.players) {
      player.resetForNewGame();
    }
  }

  /**
   * Retourne l'état de la room
   */
  getState(): RoomState {
    return {
      code: this.code,
      hostId: this._hostId ?? '',
      players: this.players.map((p) => p.toFullState()),
      settings: this._settings,
      status: this._game?.status ?? 'lobby',
    };
  }

  /**
   * Vérifie si tous les joueurs sont prêts
   */
  allPlayersReady(): boolean {
    return this.players.length >= this._settings.minPlayers && 
           this.players.every((p) => p.isReady || p.isHost);
  }
}

