import { Game, type GameConfig } from './Game.js';
import { GAME_PHASE, GAME_STATUS, type GamePhase } from '../constants.js';
import type { CreateGameOptions, GameState } from '../types/game.js';

/**
 * Configuration spécifique au Parqués
 */
export interface ParquesConfig extends GameConfig {
  boardType?: 4 | 6; // 4 ou 6 joueurs
  pawnsPerPlayer?: number;
}

/**
 * Représente un pion sur le plateau
 */
export interface PawnState {
  id: number;
  playerId: string;
  position: number; // -1 = prison, 0-67 = parcours, 100+ = llegada
  inPrison: boolean;
  inLlegada: boolean;
  llegadaPosition: number; // 0-7 dans le chemin final
  inCielo: boolean; // arrivé au but
}

/**
 * État des dés
 */
export interface DiceState {
  values: [number, number];
  hasRolled: boolean;
  rollCount: number; // nombre de lancers ce tour
  usedDice: number[]; // indices des dés utilisés: [], [0], [1], [0,1]
}

/**
 * Mouvement valide avec info sur le dé utilisé
 */
export interface ValidMove {
  pawnId: number;
  targetPosition: number;
  diceUsed: 'dice1' | 'dice2' | 'sum'; // quel dé utilise ce mouvement
  steps: number; // nombre de pas
}

/**
 * Phases spécifiques au Parqués
 */
export const PARQUES_PHASE = {
  WAITING_ROLL: 'waiting_roll',
  WAITING_MOVE: 'waiting_move',
  WAITING_EXIT: 'waiting_exit', // sortie de prison
} as const;

export type ParquesPhase = typeof PARQUES_PHASE[keyof typeof PARQUES_PHASE];

/**
 * Configuration du plateau
 */
const BOARD_CONFIG = {
  4: {
    totalCells: 68,
    cellsPerSide: 17,
    seguros: [0, 7, 17, 24, 34, 41, 51, 58],
    salidas: [0, 17, 34, 51], // positions de sortie par joueur
    llegadaCells: 8,
  },
  6: {
    totalCells: 102,
    cellsPerSide: 17,
    seguros: [0, 7, 17, 24, 34, 41, 51, 58, 68, 75, 85, 92],
    salidas: [0, 17, 34, 51, 68, 85],
    llegadaCells: 8,
  },
} as const;

/**
 * Implémentation du jeu Parqués Colombien
 */
export class ParquesGame extends Game {
  private _pawns: Map<string, PawnState[]> = new Map();
  private _dice: DiceState = { values: [1, 1], hasRolled: false, rollCount: 0, usedDice: [] };
  private _consecutiveDoubles: number = 0;
  private _prisonAttempts: Map<string, number> = new Map();
  private _boardType: 4 | 6;
  private _pawnsPerPlayer: number;
  private _parquesPhase: ParquesPhase = PARQUES_PHASE.WAITING_ROLL;
  private _selectedPawnId: number | null = null;
  private _mustEat: boolean = false;
  private _validMoves: ValidMove[] = [];

  constructor(options: CreateGameOptions, config: ParquesConfig = {}) {
    super(options, {
      minPlayers: 2,
      maxPlayers: config.boardType || 4,
      turnTimeoutMs: config.turnTimeoutMs ?? 60000,
      isPrivate: config.isPrivate,
    });

    this._boardType = config.boardType || 4;
    this._pawnsPerPlayer = config.pawnsPerPlayer || 4;
  }

  get boardConfig() {
    return BOARD_CONFIG[this._boardType];
  }

  get dice(): DiceState {
    return { ...this._dice };
  }

  get parquesPhase(): ParquesPhase {
    return this._parquesPhase;
  }

  /**
   * Initialise le jeu
   */
  async initializeGame(): Promise<void> {
    // Créer les pions pour chaque joueur
    for (const player of this.players) {
      const pawns: PawnState[] = [];
      for (let i = 0; i < this._pawnsPerPlayer; i++) {
        pawns.push({
          id: i,
          playerId: player.id,
          position: -1,
          inPrison: true,
          inLlegada: false,
          llegadaPosition: 0,
          inCielo: false,
        });
      }
      this._pawns.set(player.id, pawns);
      this._prisonAttempts.set(player.id, 0);
    }

    this._parquesPhase = PARQUES_PHASE.WAITING_ROLL;
    console.log('Parqués game initialized with', this.players.length, 'players');
  }

  /**
   * Gère les actions du jeu
   */
  async handleAction(playerId: string, action: string, data: Record<string, unknown>): Promise<boolean> {
    const player = this.getPlayer(playerId);
    if (!player) return false;

    if (this._currentPlayerId !== playerId) {
      console.log('Not player turn');
      return false;
    }

    switch (action) {
      case 'roll_dice':
        return this.rollDice(playerId);

      case 'move_pawn':
        return this.movePawn(playerId, data.pawnId as number, data.targetPosition as number, data.diceUsed as string);

      case 'exit_prison':
        return this.exitPrison(playerId);

      case 'pass':
        return this.passTurn(playerId);

      default:
        console.log('Unknown action:', action);
        return false;
    }
  }

  /**
   * Retourne les actions valides pour un joueur
   */
  getValidActions(playerId: string): string[] {
    if (this._currentPlayerId !== playerId) return [];

    const actions: string[] = [];

    switch (this._parquesPhase) {
      case PARQUES_PHASE.WAITING_ROLL:
        actions.push('roll_dice');
        break;

      case PARQUES_PHASE.WAITING_EXIT:
        actions.push('exit_prison');
        if (this._dice.hasRolled) actions.push('pass');
        break;

      case PARQUES_PHASE.WAITING_MOVE:
        if (this._validMoves.length > 0) {
          actions.push('move_pawn');
        }
        if (!this._mustEat) actions.push('pass');
        break;
    }

    return actions;
  }

  /**
   * Retourne les dés disponibles (non utilisés)
   */
  private getAvailableDice(): { dice1Available: boolean; dice2Available: boolean; isDouble: boolean } {
    const isDouble = this._dice.values[0] === this._dice.values[1];
    return {
      dice1Available: !this._dice.usedDice.includes(0),
      dice2Available: !this._dice.usedDice.includes(1),
      isDouble,
    };
  }

  /**
   * Lance les dés
   */
  private rollDice(playerId: string): boolean {
    if (this._dice.hasRolled && this._parquesPhase !== PARQUES_PHASE.WAITING_ROLL) {
      return false;
    }

    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    this._dice = {
      values: [dice1, dice2],
      hasRolled: true,
      rollCount: this._dice.rollCount + 1,
      usedDice: [], // Reset des dés utilisés
    };

    const isDouble = dice1 === dice2;

    // Gérer les doubles consécutifs
    if (isDouble) {
      this._consecutiveDoubles++;

      // 3 doubles consécutifs = un pion va directement au Cielo!
      if (this._consecutiveDoubles >= 3) {
        this.sendPawnToCielo(playerId);
        this._consecutiveDoubles = 0;
        this.endCurrentTurn();
        return true;
      }
    } else {
      this._consecutiveDoubles = 0;
    }

    // Vérifier si le joueur a des pions en jeu
    const playerPawns = this._pawns.get(playerId) || [];
    const pawnsInPrison = playerPawns.filter(p => p.inPrison);
    const pawnsOnBoard = playerPawns.filter(p => !p.inPrison && !p.inCielo);

    // Si tous les pions sont en prison
    if (pawnsOnBoard.length === 0 && pawnsInPrison.length > 0) {
      if (isDouble) {
        // Peut sortir de prison
        this._parquesPhase = PARQUES_PHASE.WAITING_EXIT;
      } else {
        // Incrémenter les tentatives de prison
        const attempts = (this._prisonAttempts.get(playerId) || 0) + 1;
        this._prisonAttempts.set(playerId, attempts);

        if (attempts >= 3) {
          // Après 3 tentatives, passe le tour
          this._prisonAttempts.set(playerId, 0);
          this.endCurrentTurn();
        }
        // Sinon reste en phase de lancer (peut relancer)
        this._dice.hasRolled = false;
      }
    } else {
      // A des pions sur le plateau
      this.calculateValidMoves(playerId);
      this._parquesPhase = PARQUES_PHASE.WAITING_MOVE;
    }

    this.recordAction(playerId, 'roll_dice', { dice: this._dice.values, isDouble });
    return true;
  }

  /**
   * Calcule les mouvements valides en fonction des dés disponibles
   */
  private calculateValidMoves(playerId: string): void {
    const playerPawns = this._pawns.get(playerId) || [];
    const [dice1, dice2] = this._dice.values;
    const { dice1Available, dice2Available, isDouble } = this.getAvailableDice();
    
    this._validMoves = [];
    this._mustEat = false;

    for (const pawn of playerPawns) {
      if (pawn.inPrison || pawn.inCielo) continue;

      // Si les deux dés sont disponibles, on peut utiliser la somme
      if (dice1Available && dice2Available && !isDouble) {
        const sum = dice1 + dice2;
        const targetSum = this.calculateTargetPosition(pawn, sum, playerId);
        if (targetSum !== null) {
          this._validMoves.push({ 
            pawnId: pawn.id, 
            targetPosition: targetSum, 
            diceUsed: 'sum',
            steps: sum
          });
        }
      }

      // Mouvement avec dé 1 (si disponible)
      if (dice1Available) {
        const target1 = this.calculateTargetPosition(pawn, dice1, playerId);
        if (target1 !== null) {
          this._validMoves.push({ 
            pawnId: pawn.id, 
            targetPosition: target1, 
            diceUsed: 'dice1',
            steps: dice1
          });
        }
      }

      // Mouvement avec dé 2 (si disponible et différent du dé 1 ou si c'est un double)
      if (dice2Available && (dice2 !== dice1 || isDouble)) {
        const target2 = this.calculateTargetPosition(pawn, dice2, playerId);
        if (target2 !== null) {
          // Éviter les doublons pour les doubles
          const alreadyExists = this._validMoves.some(
            m => m.pawnId === pawn.id && m.targetPosition === target2 && m.diceUsed === 'dice1'
          );
          if (!alreadyExists) {
            this._validMoves.push({ 
              pawnId: pawn.id, 
              targetPosition: target2, 
              diceUsed: 'dice2',
              steps: dice2
            });
          }
        }
      }
    }

    // Vérifier s'il y a une capture obligatoire
    for (const move of this._validMoves) {
      if (this.wouldCapture(playerId, move.targetPosition)) {
        this._mustEat = true;
        break;
      }
    }

    console.log(`Valid moves calculated: ${this._validMoves.length} moves, usedDice: [${this._dice.usedDice}]`);
  }

  /**
   * Calcule la position cible d'un pion
   */
  private calculateTargetPosition(pawn: PawnState, steps: number, playerId: string): number | null {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    const salida = this.boardConfig.salidas[playerIndex] || 0;
    const totalCells = this.boardConfig.totalCells;

    if (pawn.inLlegada) {
      // Dans le chemin final
      const newPos = pawn.llegadaPosition + steps;
      if (newPos === this.boardConfig.llegadaCells - 1) {
        return 100 + newPos; // Arrivée exacte au Cielo
      } else if (newPos < this.boardConfig.llegadaCells - 1) {
        return 100 + newPos; // Continue dans le chemin
      } else {
        // Rebond
        const overshoot = newPos - (this.boardConfig.llegadaCells - 1);
        return 100 + (this.boardConfig.llegadaCells - 1 - overshoot);
      }
    }

    // Sur le parcours commun
    let newPosition = (pawn.position + steps) % totalCells;

    // Vérifier si on entre dans le chemin final
    const llegadaEntry = (salida - 1 + totalCells) % totalCells;
    if (this.crossesPosition(pawn.position, newPosition, llegadaEntry, totalCells)) {
      const stepsToEntry = this.stepsToPosition(pawn.position, llegadaEntry, totalCells);
      const stepsRemaining = steps - stepsToEntry;
      if (stepsRemaining > 0) {
        const llegadaPos = stepsRemaining - 1;
        if (llegadaPos < this.boardConfig.llegadaCells) {
          return 100 + llegadaPos;
        }
        return null; // Trop de pas
      }
    }

    // Vérifier si la case est occupée par un allié
    if (this.isOccupiedByAlly(newPosition, playerId)) {
      return null;
    }

    return newPosition;
  }

  /**
   * Vérifie si une position est occupée par un pion allié
   */
  private isOccupiedByAlly(position: number, playerId: string): boolean {
    const playerPawns = this._pawns.get(playerId) || [];
    return playerPawns.some(p => p.position === position && !p.inPrison && !p.inLlegada);
  }

  /**
   * Vérifie si le mouvement capturerait un pion adverse
   */
  private wouldCapture(playerId: string, position: number): boolean {
    if (position >= 100) return false; // Dans le chemin final
    if ((this.boardConfig.seguros as readonly number[]).includes(position)) return false; // Case de sécurité

    for (const [pid, pawns] of this._pawns) {
      if (pid === playerId) continue;
      for (const pawn of pawns) {
        if (pawn.position === position && !pawn.inPrison && !pawn.inLlegada) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Calcule les pas jusqu'à une position
   */
  private stepsToPosition(from: number, to: number, total: number): number {
    if (to >= from) return to - from;
    return total - from + to;
  }

  /**
   * Vérifie si on traverse une position
   */
  private crossesPosition(from: number, to: number, target: number, total: number): boolean {
    if (from === target) return true;
    if (from < to) {
      return target >= from && target <= to;
    } else {
      return target >= from || target <= to;
    }
  }

  /**
   * Déplace un pion
   */
  private movePawn(playerId: string, pawnId: number, targetPosition: number, diceUsed?: string): boolean {
    const playerPawns = this._pawns.get(playerId);
    if (!playerPawns) return false;

    const pawn = playerPawns.find(p => p.id === pawnId);
    if (!pawn) return false;

    // Trouver le mouvement valide correspondant
    const validMove = this._validMoves.find(
      m => m.pawnId === pawnId && m.targetPosition === targetPosition && 
           (diceUsed ? m.diceUsed === diceUsed : true)
    );
    if (!validMove) {
      console.log('Move not valid:', { pawnId, targetPosition, diceUsed });
      return false;
    }

    // Capturer si nécessaire
    if (targetPosition < 100) {
      this.captureAt(playerId, targetPosition);
    }

    // Déplacer le pion
    const oldPosition = pawn.position;
    if (targetPosition >= 100) {
      const llegadaPos = targetPosition - 100;
      pawn.inLlegada = true;
      pawn.llegadaPosition = llegadaPos;
      pawn.position = -1;

      // Vérifier si arrivé au Cielo
      if (llegadaPos >= this.boardConfig.llegadaCells - 1) {
        pawn.inCielo = true;
        pawn.inLlegada = false;
      }
    } else {
      pawn.position = targetPosition;
    }

    this.recordAction(playerId, 'move_pawn', { pawnId, targetPosition, diceUsed: validMove.diceUsed });

    // Marquer le(s) dé(s) comme utilisé(s)
    if (validMove.diceUsed === 'sum') {
      // Somme = les deux dés sont utilisés
      this._dice.usedDice = [0, 1];
    } else if (validMove.diceUsed === 'dice1') {
      if (!this._dice.usedDice.includes(0)) {
        this._dice.usedDice.push(0);
      }
    } else if (validMove.diceUsed === 'dice2') {
      if (!this._dice.usedDice.includes(1)) {
        this._dice.usedDice.push(1);
      }
    }

    console.log(`Pawn ${pawnId} moved from ${oldPosition} to ${targetPosition}, usedDice: [${this._dice.usedDice}]`);

    // Vérifier victoire
    if (this.checkVictory(playerId)) {
      this.end('completed');
      return true;
    }

    // Déterminer la prochaine étape
    const isDouble = this._dice.values[0] === this._dice.values[1];
    const allDiceUsed = this._dice.usedDice.length >= 2 || 
                        (isDouble && this._dice.usedDice.length >= 1); // Pour les doubles, un seul mouvement suffit

    if (allDiceUsed) {
      // Tous les dés ont été utilisés
      if (isDouble && this._consecutiveDoubles < 3) {
        // Double: peut relancer
        this._dice = { values: [1, 1], hasRolled: false, rollCount: this._dice.rollCount, usedDice: [] };
        this._parquesPhase = PARQUES_PHASE.WAITING_ROLL;
        this._validMoves = [];
      } else {
        // Fin du tour
        this.endCurrentTurn();
      }
    } else {
      // Il reste des dés à utiliser - recalculer les mouvements valides
      this.calculateValidMoves(playerId);
      
      // Si plus de mouvements valides, fin du tour
      if (this._validMoves.length === 0) {
        if (isDouble && this._consecutiveDoubles < 3) {
          this._dice = { values: [1, 1], hasRolled: false, rollCount: this._dice.rollCount, usedDice: [] };
          this._parquesPhase = PARQUES_PHASE.WAITING_ROLL;
        } else {
          this.endCurrentTurn();
        }
      }
      // Sinon reste en WAITING_MOVE
    }

    return true;
  }

  /**
   * Capture les pions adverses à une position
   */
  private captureAt(playerId: string, position: number): void {
    // Exception: sur la Salida, on peut capturer
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    const salida = this.boardConfig.salidas[playerIndex] || 0;
    
    // Si c'est un Seguro (mais pas notre Salida), pas de capture
    if ((this.boardConfig.seguros as readonly number[]).includes(position) && position !== salida) {
      return;
    }

    for (const [pid, pawns] of this._pawns) {
      if (pid === playerId) continue;
      for (const pawn of pawns) {
        if (pawn.position === position && !pawn.inPrison && !pawn.inLlegada) {
          // Renvoyer en prison
          pawn.inPrison = true;
          pawn.position = -1;
          console.log(`Pawn captured at position ${position}`);
        }
      }
    }
  }

  /**
   * Sortie de prison
   */
  private exitPrison(playerId: string): boolean {
    const playerPawns = this._pawns.get(playerId);
    if (!playerPawns) return false;

    const isDouble = this._dice.values[0] === this._dice.values[1];
    if (!isDouble) return false;

    const pawnsInPrison = playerPawns.filter(p => p.inPrison);
    if (pawnsInPrison.length === 0) return false;

    const playerIndex = this.players.findIndex(p => p.id === playerId);
    const salida = this.boardConfig.salidas[playerIndex] || 0;

    // Double 1-1 ou 6-6 = tous les pions sortent
    // Autre double = 2 pions sortent
    const diceValue = this._dice.values[0];
    const pawnsToExit = (diceValue === 1 || diceValue === 6) ? pawnsInPrison.length : Math.min(2, pawnsInPrison.length);

    // Capturer si un adversaire est sur notre Salida
    this.captureAt(playerId, salida);

    for (let i = 0; i < pawnsToExit; i++) {
      const pawn = pawnsInPrison[i];
      if (pawn) {
        pawn.inPrison = false;
        pawn.position = salida;
      }
    }

    this._prisonAttempts.set(playerId, 0);
    this.recordAction(playerId, 'exit_prison', { count: pawnsToExit });

    // Si double, peut rejouer
    this._dice = { values: [1, 1], hasRolled: false, rollCount: this._dice.rollCount, usedDice: [] };
    this._parquesPhase = PARQUES_PHASE.WAITING_ROLL;

    return true;
  }

  /**
   * Passe le tour
   */
  private passTurn(playerId: string): boolean {
    if (this._mustEat) {
      // Règle du "souffler" - si on oublie de manger, un pion retourne en prison
      console.log('Player must eat but passed - penalty!');
      // TODO: Implémenter la pénalité
    }

    // Si c'est un double et qu'on a utilisé au moins un dé, permettre de relancer
    const isDouble = this._dice.values[0] === this._dice.values[1];
    if (isDouble && this._dice.usedDice.length > 0 && this._consecutiveDoubles < 3) {
      this._dice = { values: [1, 1], hasRolled: false, rollCount: this._dice.rollCount, usedDice: [] };
      this._parquesPhase = PARQUES_PHASE.WAITING_ROLL;
      this._validMoves = [];
      return true;
    }

    this.endCurrentTurn();
    return true;
  }

  /**
   * Envoie un pion directement au Cielo (règle des 3 doubles)
   */
  private sendPawnToCielo(playerId: string): void {
    const playerPawns = this._pawns.get(playerId);
    if (!playerPawns) return;

    // Envoyer le pion le plus avancé au Cielo
    const pawnsNotInCielo = playerPawns.filter(p => !p.inCielo);
    if (pawnsNotInCielo.length === 0) return;

    // Priorité: sur le plateau > en llegada > en prison
    const pawn = pawnsNotInCielo.sort((a, b) => {
      if (a.inLlegada && !b.inLlegada) return -1;
      if (!a.inLlegada && b.inLlegada) return 1;
      if (!a.inPrison && b.inPrison) return -1;
      if (a.inPrison && !b.inPrison) return 1;
      return b.position - a.position;
    })[0];

    if (pawn) {
      pawn.inCielo = true;
      pawn.inPrison = false;
      pawn.inLlegada = false;
      pawn.position = -1;
      console.log('Pawn sent to Cielo via 3 doubles rule!');
    }
  }

  /**
   * Vérifie si un joueur a gagné
   */
  private checkVictory(playerId: string): boolean {
    const playerPawns = this._pawns.get(playerId);
    if (!playerPawns) return false;

    return playerPawns.every(p => p.inCielo);
  }

  /**
   * Fin de la partie
   */
  async onGameEnd(reason: string): Promise<void> {
    console.log('Game ended:', reason);
    this.calculateScores();
  }

  /**
   * Calcule les scores
   */
  calculateScores(): void {
    for (const player of this.players) {
      const pawns = this._pawns.get(player.id) || [];
      const pawnsInCielo = pawns.filter(p => p.inCielo).length;
      player.score = pawnsInCielo * 100;
    }
  }

  /**
   * Termine le tour actuel
   */
  protected endCurrentTurn(): void {
    super.endCurrentTurn();
    this._dice = { values: [1, 1], hasRolled: false, rollCount: 0, usedDice: [] };
    this._consecutiveDoubles = 0;
    this._parquesPhase = PARQUES_PHASE.WAITING_ROLL;
    this._validMoves = [];
    this._mustEat = false;
  }

  /**
   * Retourne l'état du jeu
   */
  getState(): GameState {
    const baseState = super.getState();

    // Convertir les pions en objet sérialisable
    const pawnsData: Record<string, PawnState[]> = {};
    for (const [playerId, pawns] of this._pawns) {
      pawnsData[playerId] = pawns.map(p => ({ ...p }));
    }

    // Calculer les dés restants
    const { dice1Available, dice2Available } = this.getAvailableDice();
    const remainingDice: number[] = [];
    if (dice1Available) remainingDice.push(this._dice.values[0]);
    if (dice2Available) remainingDice.push(this._dice.values[1]);

    return {
      ...baseState,
      gameData: {
        ...baseState.gameData,
        boardType: this._boardType,
        pawns: pawnsData,
        dice: this._dice,
        remainingDice, // Dés encore disponibles
        consecutiveDoubles: this._consecutiveDoubles,
        parquesPhase: this._parquesPhase,
        validMoves: this._validMoves,
        mustEat: this._mustEat,
      },
    };
  }
}
