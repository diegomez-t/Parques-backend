/**
 * Limites et constantes partagées
 */
export const LIMITS = {
  // Utilisateur
  USERNAME_MIN: 2,
  USERNAME_MAX: 30,
  PASSWORD_MIN: 8,
  
  // Room
  ROOM_CODE_LENGTH: 6,
  PLAYERS_MIN: 2,
  PLAYERS_MAX: 4,
  
  // Chat
  CHAT_MESSAGE_MAX: 500,
  
  // Jeu
  TURN_TIMEOUT_DEFAULT: 60000, // 60 secondes
  RECONNECT_TIMEOUT_DEFAULT: 120000, // 2 minutes
} as const;

/**
 * Paramètres par défaut du jeu
 */
export const DEFAULT_SETTINGS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  TURN_TIMEOUT_MS: 60000,
  RECONNECT_TIMEOUT_MS: 120000,
} as const;

/**
 * Couleurs des joueurs (4 joueurs maximum)
 */
export const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow'] as const;
export type PlayerColor = typeof PLAYER_COLORS[number];

