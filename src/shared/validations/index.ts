import { z } from 'zod';
import { LIMITS } from '../constants.js';

/**
 * Validation du nom d'utilisateur
 */
export const usernameSchema = z
  .string()
  .min(LIMITS.USERNAME_MIN, `Minimum ${LIMITS.USERNAME_MIN} caractères`)
  .max(LIMITS.USERNAME_MAX, `Maximum ${LIMITS.USERNAME_MAX} caractères`)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Caractères alphanumériques, _ et - uniquement');

/**
 * Validation de l'email
 */
export const emailSchema = z.string().email('Email invalide');

/**
 * Validation du mot de passe
 */
export const passwordSchema = z
  .string()
  .min(8, 'Minimum 8 caractères')
  .regex(/[A-Z]/, 'Au moins une majuscule requise')
  .regex(/[a-z]/, 'Au moins une minuscule requise')
  .regex(/[0-9]/, 'Au moins un chiffre requis');

/**
 * Validation du code de room
 */
export const roomCodeSchema = z
  .string()
  .length(LIMITS.ROOM_CODE_LENGTH, `Code de ${LIMITS.ROOM_CODE_LENGTH} caractères`)
  .regex(/^[A-Z0-9]+$/, 'Code invalide')
  .transform((val) => val.toUpperCase());

/**
 * Validation d'un message de chat
 */
export const chatMessageSchema = z
  .string()
  .min(1, 'Message vide')
  .max(LIMITS.CHAT_MESSAGE_MAX, `Maximum ${LIMITS.CHAT_MESSAGE_MAX} caractères`)
  .transform((val) => val.trim());

/**
 * Schéma de création de compte
 */
export const signupSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * Schéma de connexion
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schéma de création de room
 */
export const createRoomSchema = z.object({
  playerName: usernameSchema,
  avatar: z.string().optional(),
  settings: z
    .object({
      maxPlayers: z
        .number()
        .min(LIMITS.PLAYERS_MIN)
        .max(LIMITS.PLAYERS_MAX)
        .optional(),
      turnTimeoutMs: z.number().min(10000).max(300000).optional(),
      isPrivate: z.boolean().optional(),
    })
    .optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

/**
 * Schéma pour rejoindre une room
 */
export const joinRoomSchema = z.object({
  roomCode: roomCodeSchema,
  playerName: usernameSchema,
  avatar: z.string().optional(),
});

export type JoinRoomInput = z.infer<typeof joinRoomSchema>;

/**
 * Schéma de mise à jour des paramètres
 */
export const updateSettingsSchema = z.object({
  minPlayers: z.number().min(2).max(LIMITS.PLAYERS_MAX).optional(),
  maxPlayers: z.number().min(2).max(LIMITS.PLAYERS_MAX).optional(),
  turnTimeoutMs: z.number().min(10000).max(300000).optional(),
  isPrivate: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/**
 * Schéma d'action de jeu générique
 */
export const gameActionSchema = z.object({
  type: z.string().min(1),
  data: z.record(z.unknown()).optional().default({}),
});

export type GameActionInput = z.infer<typeof gameActionSchema>;

/**
 * Schéma de mise à jour du profil
 */
export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  avatar: z.string().optional(),
  settings: z
    .object({
      language: z.string().min(2).max(5).optional(),
      theme: z.enum(['light', 'dark', 'system']).optional(),
      soundEnabled: z.boolean().optional(),
      notificationsEnabled: z.boolean().optional(),
    })
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Helper pour valider avec Zod
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

// Validations spécifiques au Parqués
export * from './parques.js';

