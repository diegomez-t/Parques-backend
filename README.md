# Parqués Backend

Backend pour le jeu de société Parqués Colombien. Construit avec Express.js, MongoDB, Socket.IO et TypeScript.

## 🚀 Démarrage Rapide

### Prérequis

- Node.js >= 20.0.0
- Yarn 4+ (Berry)
- MongoDB (local ou Atlas)

### Installation

```bash
# Cloner le repo
git clone <repo-url>
cd parques-backend

# Installer les dépendances
yarn install

# Copier le fichier d'environnement
cp env.example .env
```

### Configuration

Modifier le fichier `.env` avec vos valeurs :

```env
# Configuration du serveur
PORT=3000
NODE_ENV=development

# MongoDB
CONNECTION_STRING=mongodb://localhost:27017/parques

# JWT
JWT_SECRET=votre_secret_jwt_de_32_caracteres_minimum
JWT_EXPIRES_IN=7d

# Session
SESSION_SECRET=votre_secret_session_tres_long_et_securise

# CORS (URL du frontend)
CORS_ORIGIN=http://localhost:3001
```

### Lancement

```bash
# Mode développement (avec rechargement automatique)
yarn dev

# Build TypeScript
yarn build

# Mode production
yarn start
```

## 📁 Structure du Projet

```
parques-backend/
├── bin/
│   ├── www                 # Point d'entrée production
│   └── www-dev.ts          # Point d'entrée développement
├── src/
│   ├── app.ts              # Configuration Express
│   ├── config/
│   │   ├── dbConnect.ts    # Connexion MongoDB
│   │   └── passport.ts     # Configuration Passport.js
│   ├── controllers/
│   │   ├── authController.ts
│   │   └── userController.ts
│   ├── core/               # Moteur de jeu
│   │   ├── classes/
│   │   │   ├── Game.ts     # Logique du jeu
│   │   │   ├── GameRoom.ts # Gestion des salles
│   │   │   └── Player.ts   # Entité joueur
│   │   ├── constants.ts
│   │   ├── index.ts
│   │   └── types/
│   │       ├── events.ts   # Types d'événements Socket
│   │       ├── game.ts     # Types du jeu
│   │       └── player.ts   # Types du joueur
│   ├── middlewares/
│   │   ├── authMiddleware.ts
│   │   └── rateLimiter.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Game.ts
│   │   └── GameHistory.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── game.ts
│   │   ├── index.ts
│   │   └── users.ts
│   ├── shared/
│   │   ├── constants.ts
│   │   └── validations/
│   │       ├── index.ts
│   │       └── parques.ts  # Validations Zod
│   └── socket/
│       ├── index.ts
│       ├── RoomManager.ts
│       └── handlers/
│           ├── chat.ts
│           ├── connection.ts
│           ├── game.ts
│           └── room.ts
├── env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 🔌 API Endpoints

### Santé

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/health` | Vérification de l'état du serveur |

### Authentification

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/auth/register` | Inscription |
| POST | `/auth/login` | Connexion |
| POST | `/auth/guest` | Connexion invité |
| GET | `/auth/me` | Profil utilisateur |
| PUT | `/auth/profile` | Modifier le profil |
| POST | `/auth/logout` | Déconnexion |

### Jeux

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/games/rooms` | Liste des rooms publiques |
| GET | `/api/games/rooms/:code` | Détails d'une room |
| GET | `/api/games/stats` | Statistiques globales |

### Utilisateurs

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/users/profile` | Mon profil |
| PUT | `/api/users/profile` | Modifier mon profil |
| GET | `/api/users/:id` | Profil public |

## 🔌 Socket.IO Events

### Client → Serveur

| Event | Description |
|-------|-------------|
| `room:create` | Créer une room |
| `room:join` | Rejoindre une room |
| `room:leave` | Quitter une room |
| `room:settings` | Modifier les paramètres |
| `game:start` | Démarrer la partie |
| `game:action` | Action de jeu (lancer dés, déplacer pion) |
| `game:ready` | Marquer comme prêt |
| `chat:message` | Envoyer un message |

### Serveur → Client

| Event | Description |
|-------|-------------|
| `room:updated` | État de la room mis à jour |
| `room:player-joined` | Un joueur a rejoint |
| `room:player-left` | Un joueur est parti |
| `room:closed` | Room fermée |
| `game:started` | Partie démarrée |
| `game:state` | État du jeu |
| `game:ended` | Partie terminée |
| `chat:message` | Message reçu |
| `error` | Erreur |

## 🛠️ Technologies

| Technologie | Version | Usage |
|-------------|---------|-------|
| Express.js | 4.21 | Framework web |
| MongoDB/Mongoose | 8.16 | Base de données |
| Socket.IO | 4.7 | Communication temps réel |
| Passport.js | 0.7 | Authentification |
| Argon2 | 0.43 | Hashage des mots de passe |
| JWT | 9.0 | Tokens d'authentification |
| Zod | 3.23 | Validation des données |
| TypeScript | 5.5 | Typage statique |

## 🎮 Règles du Parqués

Le Parqués est un jeu de plateau colombien similaire au Parcheesi/Ludo. Chaque joueur a 4 pions qu'il doit faire sortir de prison, parcourir le plateau et atteindre le "Cielo" (ciel).

### Sortie de Prison
- **Double 1-1 ou 6-6** : Sort tous les pions
- **Autre double** : Sort 2 pions
- **Pas de double** : Reste en prison (3 tentatives)

### Mouvements
- **Somme des dés** : Déplacer un pion
- **Dés séparés** : Déplacer deux pions différents

### Cases Spéciales
- **SALIDA** : Case de départ (sortie de prison)
- **SEGURO** : Cases de sécurité (immunité)
- **LLEGADA** : Chemin final vers le Cielo
- **CIELO** : Case de victoire

### Captures
- Atterrir sur un adversaire l'envoie en prison
- Impossible sur les cases SEGURO (sauf SALIDA)

### Règle des 3 doubles
Faire 3 doubles consécutifs permet d'envoyer un pion directement au Cielo !

## 📝 Scripts

```bash
yarn dev       # Développement avec hot-reload (tsx + nodemon)
yarn build     # Compilation TypeScript
yarn start     # Production (après build)
yarn test      # Tests (à configurer)
```

## 📝 Licence

MIT
