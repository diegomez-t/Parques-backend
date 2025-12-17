import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Interface pour un utilisateur
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email?: string;
  passwordHash?: string;
  avatar?: string;
  isGuest: boolean;
  
  // OAuth
  oauthProvider?: 'google' | 'facebook' | 'discord';
  oauthId?: string;
  
  // Statistiques
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
    playTime: number; // en minutes
    [key: string]: number;
  };
  
  // Préférences
  settings: {
    language: string;
    theme: 'light' | 'dark' | 'system';
    soundEnabled: boolean;
    notificationsEnabled: boolean;
  };
  
  // Dates
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      select: false, // Ne pas retourner par défaut
    },
    avatar: {
      type: String,
      default: 'default',
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    
    // OAuth
    oauthProvider: {
      type: String,
      enum: ['google', 'facebook', 'discord'],
    },
    oauthId: String,
    
    // Statistiques
    stats: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      totalScore: { type: Number, default: 0 },
      playTime: { type: Number, default: 0 },
    },
    
    // Préférences
    settings: {
      language: { type: String, default: 'fr' },
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      soundEnabled: { type: Boolean, default: true },
      notificationsEnabled: { type: Boolean, default: true },
    },
    
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

// Index pour la recherche
UserSchema.index({ username: 'text' });
UserSchema.index({ email: 1 });
UserSchema.index({ oauthProvider: 1, oauthId: 1 });

// Méthodes d'instance
UserSchema.methods.updateStats = function (
  this: IUser,
  updates: Partial<IUser['stats']>
) {
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === 'number') {
      this.stats[key] = (this.stats[key] || 0) + value;
    }
  }
  return this.save();
};

export const User = mongoose.model<IUser>('User', UserSchema);

