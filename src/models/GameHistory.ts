import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Interface pour l'historique d'une partie
 */
export interface IGameHistory extends Document {
  _id: mongoose.Types.ObjectId;
  gameId: mongoose.Types.ObjectId;
  roomCode: string;
  
  // Résultats
  players: {
    odiumuserId?: mongoose.Types.ObjectId;
    odiumguestId?: string;
    username: string;
    color: string;
    rank: number; // Position finale (1 = gagnant)
    score: number;
    stats: {
      pawnsFinished: number;
      captures: number;
      capturedBy: number;
      doublesRolled: number;
      totalMoves: number;
    };
  }[];
  
  // Métadonnées
  duration: number; // en secondes
  totalTurns: number;
  boardMode: 'FOUR_PLAYERS' | 'SIX_PLAYERS';
  
  // Timestamps
  playedAt: Date;
  createdAt: Date;
}

const GameHistorySchema = new Schema<IGameHistory>(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    roomCode: {
      type: String,
      required: true,
    },
    players: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      guestId: String,
      username: { type: String, required: true },
      color: { type: String, required: true },
      rank: { type: Number, required: true },
      score: { type: Number, default: 0 },
      stats: {
        pawnsFinished: { type: Number, default: 0 },
        captures: { type: Number, default: 0 },
        capturedBy: { type: Number, default: 0 },
        doublesRolled: { type: Number, default: 0 },
        totalMoves: { type: Number, default: 0 },
      },
    }],
    duration: {
      type: Number,
      required: true,
    },
    totalTurns: {
      type: Number,
      required: true,
    },
    boardMode: {
      type: String,
      enum: ['FOUR_PLAYERS', 'SIX_PLAYERS'],
      required: true,
    },
    playedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index
GameHistorySchema.index({ gameId: 1 });
GameHistorySchema.index({ 'players.userId': 1 });
GameHistorySchema.index({ playedAt: -1 });

export const GameHistory = mongoose.model<IGameHistory>('GameHistory', GameHistorySchema);

