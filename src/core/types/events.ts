import type { GameSettings, GameState } from './game.js';
import type { PlayerState } from './player.js';

/**
 * Événements client → serveur
 */
export interface ClientToServerEvents {
  // Room events
  'room:create': (data: CreateRoomPayload, callback: (response: RoomResponse) => void) => void;
  'room:join': (data: JoinRoomPayload, callback: (response: RoomResponse) => void) => void;
  'room:leave': () => void;
  'room:settings': (data: Partial<GameSettings>) => void;

  // Game events
  'game:start': () => void;
  'game:action': (data: GameActionPayload, callback: (response: ActionResponse) => void) => void;
  'game:ready': (isReady: boolean) => void;

  // Player events
  'player:kick': (playerId: string) => void;
  'player:transfer-host': (playerId: string) => void;

  // Chat
  'chat:message': (message: string) => void;

  // Connection
  'ping': () => void;
}

/**
 * Événements serveur → client
 */
export interface ServerToClientEvents {
  // Room events
  'room:updated': (state: RoomState) => void;
  'room:player-joined': (player: PlayerState) => void;
  'room:player-left': (playerId: string) => void;
  'room:closed': (reason: string) => void;

  // Game events
  'game:started': (state: GameState) => void;
  'game:state': (state: GameState) => void;
  'game:action': (action: GameActionResult) => void;
  'game:ended': (result: GameEndPayload) => void;

  // Turn events
  'turn:start': (data: TurnStartPayload) => void;
  'turn:timeout-warning': (secondsRemaining: number) => void;
  'turn:ended': (data: TurnEndPayload) => void;

  // Chat
  'chat:message': (data: ChatMessagePayload) => void;
  'chat:system': (message: string) => void;

  // Connection
  'pong': () => void;

  // Errors
  'error': (error: ErrorPayload) => void;
}

// Payloads

export interface CreateRoomPayload {
  playerName: string;
  avatar?: string;
  settings?: Partial<GameSettings>;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
  avatar?: string;
}

export interface RoomResponse {
  success: boolean;
  roomCode?: string;
  error?: string;
}

export interface RoomState {
  code: string;
  hostId: string;
  players: PlayerState[];
  settings: GameSettings;
  status: string;
}

export interface GameActionPayload {
  type: string;
  data: Record<string, unknown>;
}

export interface ActionResponse {
  success: boolean;
  error?: string;
}

export interface GameActionResult {
  playerId: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface GameEndPayload {
  winnerId: string | null;
  rankings: Array<{
    playerId: string;
    rank: number;
    score: number;
  }>;
  stats: Record<string, unknown>;
}

export interface TurnStartPayload {
  playerId: string;
  timeoutMs: number;
  validActions: string[];
}

export interface TurnEndPayload {
  playerId: string;
  action: GameActionResult;
  nextPlayerId: string | null;
}

export interface ChatMessagePayload {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

