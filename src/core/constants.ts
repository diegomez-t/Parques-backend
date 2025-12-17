/**
 * Statuts possibles d'une partie
 */
export const GAME_STATUS = {
  LOBBY: 'lobby',
  STARTING: 'starting',
  PLAYING: 'playing',
  PAUSED: 'paused',
  FINISHED: 'finished',
  CANCELLED: 'cancelled',
} as const;

export type GameStatus = (typeof GAME_STATUS)[keyof typeof GAME_STATUS];

/**
 * Statuts de connexion des joueurs
 */
export const CONNECTION_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  SPECTATING: 'spectating',
} as const;

export type ConnectionStatus = (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS];

/**
 * Types d'actions de jeu
 */
export const TURN_ACTION = {
  DRAW_CARD: 'draw_card',
  PLAY_CARD: 'play_card',
  DISCARD: 'discard',
  PASS: 'pass',
  SPECIAL: 'special',
} as const;

export type TurnAction = (typeof TURN_ACTION)[keyof typeof TURN_ACTION];

/**
 * Phases de jeu génériques
 */
export const GAME_PHASE = {
  SETUP: 'setup',
  DEAL: 'deal',
  PLAY: 'play',
  SCORING: 'scoring',
  END_ROUND: 'end_round',
  END_GAME: 'end_game',
} as const;

export type GamePhase = (typeof GAME_PHASE)[keyof typeof GAME_PHASE];

/**
 * Paramètres par défaut
 */
export const DEFAULT_SETTINGS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
  TURN_TIMEOUT_MS: 60000, // 60 secondes
  RECONNECT_TIMEOUT_MS: 120000, // 2 minutes
  AFK_WARNING_MS: 45000, // 45 secondes
  MAX_AFK_COUNT: 3,
} as const;

/**
 * Événements Socket.IO standards
 */
export const SOCKET_EVENTS = {
  // Connexion
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',

  // Lobby
  CREATE_ROOM: 'room:create',
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  ROOM_UPDATED: 'room:updated',

  // Jeu
  GAME_START: 'game:start',
  GAME_STATE: 'game:state',
  GAME_ACTION: 'game:action',
  GAME_END: 'game:end',

  // Tours
  TURN_START: 'turn:start',
  TURN_ACTION: 'turn:action',
  TURN_END: 'turn:end',
  TURN_TIMEOUT: 'turn:timeout',

  // Joueurs
  PLAYER_JOINED: 'player:joined',
  PLAYER_LEFT: 'player:left',
  PLAYER_READY: 'player:ready',
  PLAYER_ACTION: 'player:action',

  // Chat
  CHAT_MESSAGE: 'chat:message',
  CHAT_SYSTEM: 'chat:system',

  // Erreurs
  ERROR: 'error',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

