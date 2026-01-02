import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Interface pour une partie
 */
export interface IGame extends Document {
  _id: mongoose.Types.ObjectId;
  roomCode: string;
  hostId: mongoose.Types.ObjectId;
  
  // Joueurs
  players: {
    odiumUserId?: mongoose.Types.ObjectId;
    odiumguestId?: string;
    username: string;
    color: string;
    joinedAt: Date;
    isHost: boolean;
  }[];
  
  // Configuration (4 joueurs uniquement)
  settings: {
    boardMode: 'FOUR_PLAYERS';
    enableBounce: boolean;
    enableTripleDoubleBonus: boolean;
    enableBlowRule: boolean;
    turnTimeoutMs: number;
    minPlayers: number;
    maxPlayers: number; // max 4
    isPrivate: boolean;
  };
  
  // État
  status: 'waiting' | 'playing' | 'finished' | 'cancelled';
  winnerId?: mongoose.Types.ObjectId | string;
  
  // Timestamps
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GameSchema = new Schema<IGame>(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    players: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      guestId: String,
      username: { type: String, required: true },
      color: { type: String, required: true },
      joinedAt: { type: Date, default: Date.now },
      isHost: { type: Boolean, default: false },
    }],
    settings: {
      boardMode: { type: String, enum: ['FOUR_PLAYERS'], default: 'FOUR_PLAYERS' },
      enableBounce: { type: Boolean, default: true },
      enableTripleDoubleBonus: { type: Boolean, default: false },
      enableBlowRule: { type: Boolean, default: false },
      turnTimeoutMs: { type: Number, default: 60000 },
      minPlayers: { type: Number, default: 2, min: 2, max: 4 },
      maxPlayers: { type: Number, default: 4, min: 2, max: 4 },
      isPrivate: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['waiting', 'playing', 'finished', 'cancelled'],
      default: 'waiting',
    },
    winnerId: {
      type: Schema.Types.Mixed, // ObjectId ou String (pour les invités)
    },
    startedAt: Date,
    endedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index
GameSchema.index({ roomCode: 1 });
GameSchema.index({ status: 1 });
GameSchema.index({ hostId: 1 });
GameSchema.index({ createdAt: -1 });

export const Game = mongoose.model<IGame>('Game', GameSchema);

