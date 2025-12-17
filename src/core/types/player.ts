import type { ConnectionStatus } from '../constants.js';

/**
 * Données de base d'un joueur
 */
export interface PlayerData {
  id: string;
  name: string;
  avatar?: string;
  userId?: string;
  isGuest: boolean;
}

/**
 * État d'un joueur dans une partie
 */
export interface PlayerState extends PlayerData {
  socketId: string;
  connectionStatus: ConnectionStatus;
  isHost: boolean;
  isReady: boolean;
  score: number;
  turnOrder: number;
  stats: PlayerGameStats;
  gameData: Record<string, unknown>;
}

/**
 * Statistiques d'un joueur pendant une partie
 */
export interface PlayerGameStats {
  cardsPlayed: number;
  cardsDrawn: number;
  turnsPlayed: number;
  timeSpent: number;
  afkCount: number;
  [key: string]: number;
}

/**
 * Profil utilisateur
 */
export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  stats: UserStats;
  settings: UserSettings;
}

/**
 * Statistiques globales d'un utilisateur
 */
export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  totalScore: number;
  averageScore: number;
  playTime: number;
  [key: string]: number;
}

/**
 * Préférences utilisateur
 */
export interface UserSettings {
  language: string;
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  [key: string]: unknown;
}

/**
 * Score d'une manche
 */
export type RoundScore = number | '-' | { score: number; penalty?: number; bonus?: number };

/**
 * Données pour la sérialisation JSON d'un joueur
 */
export interface PlayerJSON {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  connectionStatus: ConnectionStatus;
  isHost: boolean;
  isReady: boolean;
  turnOrder: number;
}

