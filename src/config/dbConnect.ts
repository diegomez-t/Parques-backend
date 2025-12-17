import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.CONNECTION_STRING;
if (!uri) {
  throw new Error('Veuillez définir la variable d\'environnement CONNECTION_STRING');
}

// Cache global pour éviter de reconnecter à chaque invocation
declare global {
  var _mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

globalThis._mongooseCache ??= { conn: null, promise: null };
const cache = globalThis._mongooseCache;

export default async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) {
    console.log('=> ♻️  Réutilisation de la connexion MongoDB');
    return cache.conn;
  }

  if (!cache.promise) {
    console.log('=> 🟡  Nouvelle connexion MongoDB...');
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        connectTimeoutMS: 60000,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 120000,
        maxPoolSize: 10,
        retryWrites: true,
        retryReads: true,
        heartbeatFrequencyMS: 30000,
        maxIdleTimeMS: 300000,
        waitQueueTimeoutMS: 30000
      })
      .then((m) => {
        console.log('=> ✅  Connecté à MongoDB');
        return m;
      });
  }

  cache.conn = await cache.promise.catch((err) => {
    cache.promise = null;
    console.error('=> ❌  Erreur connexion MongoDB :', err);
    throw err;
  });

  return cache.conn;
}

// Écouteurs d'événements
mongoose.connection.on('error', (e) => console.error('Mongoose error:', e));
mongoose.connection.on('disconnected', () => console.log('MongoDB déconnecté'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnecté'));

export async function disconnectDB(): Promise<void> {
  if (cache.conn) {
    await mongoose.disconnect();
    cache.conn = null;
    cache.promise = null;
    console.log('MongoDB: Déconnecté proprement');
  }
}

