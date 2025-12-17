import { z } from 'zod';

/**
 * Schémas de validation Zod pour le Parqués
 */

// Couleurs des joueurs
export const PlayerColorSchema = z.enum([
  'red',
  'blue',
  'green',
  'yellow',
  'orange',
  'purple',
]);

// Mode de plateau
export const BoardModeSchema = z.enum(['FOUR_PLAYERS', 'SIX_PLAYERS']);

// État du pion
export const PawnStateSchema = z.enum([
  'in_prison',
  'on_board',
  'in_llegada',
  'finished',
]);

// Type de case
export const CellTypeSchema = z.enum([
  'normal',
  'seguro',
  'salida',
  'llegada_path',
  'cielo',
  'prison',
]);

// Phase du tour
export const TurnPhaseSchema = z.enum([
  'waiting_roll',
  'rolling',
  'must_exit_prison',
  'choosing_move',
  'executing_move',
  'capture_resolution',
  'bonus_roll',
  'turn_end',
]);

// Configuration du jeu
export const ParquesSettingsSchema = z.object({
  boardMode: BoardModeSchema,
  enableBounce: z.boolean().default(true),
  enableTripleDoubleBonus: z.boolean().default(true),
  enableBlowRule: z.boolean().default(false),
  turnTimeoutMs: z.number().min(10000).max(120000).default(45000),
  minPlayers: z.number().min(2).max(6).default(2),
  maxPlayers: z.number().min(2).max(6).default(4),
  isPrivate: z.boolean().default(false),
});

// Création de partie
export const CreateParquesGameSchema = z.object({
  hostId: z.string().uuid(),
  settings: ParquesSettingsSchema.partial().optional(),
});

// Rejoindre une partie
export const JoinParquesGameSchema = z.object({
  gameCode: z.string().length(6).regex(/^[A-Z0-9]+$/),
  playerName: z.string().min(2).max(20),
  socketId: z.string(),
});

// Lancer de dés
export const DiceRollSchema = z.object({
  dice: z.tuple([z.number().min(1).max(6), z.number().min(1).max(6)]),
  total: z.number().min(2).max(12),
  isDouble: z.boolean(),
  timestamp: z.number(),
});

// Mouvement de pion
export const MovePawnPayloadSchema = z.object({
  pawnId: z.string().uuid(),
  diceValue: z.number().min(1).max(12),
});

// Mouvement divisé (deux pions, un dé chacun)
export const SplitMovePayloadSchema = z.object({
  moves: z.array(
    z.object({
      pawnId: z.string().uuid(),
      diceIndex: z.union([z.literal(0), z.literal(1)]),
    })
  ).length(2),
});

// État d'un pion (pour transmission)
export const PawnDataSchema = z.object({
  id: z.string().uuid(),
  color: PlayerColorSchema,
  playerId: z.string().uuid(),
  index: z.number().min(0).max(3),
  state: PawnStateSchema,
  cellId: z.number().nullable(),
  llegadaPosition: z.number().min(0).max(8).nullable(),
  distanceTraveled: z.number().min(0),
  isProtected: z.boolean(),
});

// État d'un joueur Parqués
export const ParquesPlayerStateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  avatar: z.string().optional(),
  color: PlayerColorSchema,
  pawns: z.array(PawnDataSchema),
  pawnsInPrison: z.number().min(0).max(4),
  pawnsFinished: z.number().min(0).max(4),
  consecutiveDoubles: z.number().min(0).max(3),
  hasWon: z.boolean(),
  finalRank: z.number().min(1).max(6).nullable(),
  isHost: z.boolean(),
  isReady: z.boolean(),
  connectionStatus: z.enum(['connected', 'disconnected', 'reconnecting']),
});

// Option de mouvement valide
export const PawnMoveOptionSchema = z.object({
  pawnId: z.string().uuid(),
  targetCellId: z.number().nullable(),
  diceValue: z.number().min(1).max(12),
  canCapture: z.boolean(),
  mustCapture: z.boolean(),
  capturablePawnIds: z.array(z.string().uuid()),
  entersLlegada: z.boolean(),
  reachesCielo: z.boolean(),
  llegadaPosition: z.number().nullable(),
});

// État complet de la partie (pour sync client)
export const ParquesGameStateSchema = z.object({
  id: z.string().uuid(),
  code: z.string().length(6),
  status: z.enum(['lobby', 'starting', 'playing', 'paused', 'finished']),
  phase: z.enum(['setup', 'distribution', 'play', 'scoring', 'end_game']),
  hostId: z.string().uuid(),
  currentPlayerId: z.string().uuid().nullable(),
  players: z.array(ParquesPlayerStateSchema),
  turnPhase: TurnPhaseSchema,
  validMoves: z.array(PawnMoveOptionSchema),
  movablePawns: z.array(z.string().uuid()),
  prisonAttempts: z.number().min(0).max(3),
  finishedPlayers: z.array(z.string().uuid()),
  isGameOver: z.boolean(),
  winnerId: z.string().uuid().nullable(),
});

// Événements Socket.IO
export const RollDiceEventSchema = z.object({
  gameId: z.string().uuid(),
});

export const MovePawnEventSchema = z.object({
  gameId: z.string().uuid(),
  pawnId: z.string().uuid(),
  diceValue: z.number().min(1).max(12),
});

export const PassTurnEventSchema = z.object({
  gameId: z.string().uuid(),
});

// Types inférés
export type PlayerColor = z.infer<typeof PlayerColorSchema>;
export type BoardMode = z.infer<typeof BoardModeSchema>;
export type PawnState = z.infer<typeof PawnStateSchema>;
export type CellType = z.infer<typeof CellTypeSchema>;
export type TurnPhase = z.infer<typeof TurnPhaseSchema>;
export type ParquesSettings = z.infer<typeof ParquesSettingsSchema>;
export type CreateParquesGame = z.infer<typeof CreateParquesGameSchema>;
export type JoinParquesGame = z.infer<typeof JoinParquesGameSchema>;
export type DiceRoll = z.infer<typeof DiceRollSchema>;
export type MovePawnPayload = z.infer<typeof MovePawnPayloadSchema>;
export type SplitMovePayload = z.infer<typeof SplitMovePayloadSchema>;
export type PawnData = z.infer<typeof PawnDataSchema>;
export type ParquesPlayerState = z.infer<typeof ParquesPlayerStateSchema>;
export type PawnMoveOption = z.infer<typeof PawnMoveOptionSchema>;
export type ParquesGameState = z.infer<typeof ParquesGameStateSchema>;

