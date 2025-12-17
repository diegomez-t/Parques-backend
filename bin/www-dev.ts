#!/usr/bin/env tsx
import 'dotenv/config';
import http from 'http';
import createApp from '../src/app.js';
import { initializeSocketServer } from '../src/socket/index.js';
import dbConnect from '../src/config/dbConnect.js';

const port = normalizePort(process.env.PORT || '3001');

async function startServer() {
  try {
    // Connexion à la base de données
    await dbConnect();
    
    // Création de l'application Express
    const app = await createApp();
    app.set('port', port);

    // Création du serveur HTTP
    const server = http.createServer(app);

    // Initialisation de Socket.IO
    await initializeSocketServer(server);
    console.log('✅ Socket.IO initialisé');

    // Démarrage du serveur
    server.listen(port);
    server.on('error', onError);
    server.on('listening', () => onListening(server));
  } catch (error) {
    console.error('❌ Erreur au démarrage:', error);
    process.exit(1);
  }
}

function normalizePort(val: string): number | string | false {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
}

function onError(error: NodeJS.ErrnoException) {
  if (error.syscall !== 'listen') throw error;

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening(server: http.Server) {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr?.port;
  console.log(`🚀 Serveur Parqués démarré sur le ${bind}`);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nSIGTERM reçu, arrêt en cours...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT reçu, arrêt en cours...');
  process.exit(0);
});

startServer();

