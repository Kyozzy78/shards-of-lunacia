export type Team = 'player' | 'enemy';
export type Phase = 'PLAYER_PHASE' | 'ENEMY_PHASE' | 'VICTORY' | 'DEFEAT';
export type CoverLevel = 'none' | 'half' | 'full';
export type Visibility = 'unknown' | 'explored' | 'visible';
export type ActionMode = 'move' | 'attack' | 'ability' | null;
export type AxieClass = 'Beast' | 'Bird' | 'Plant' | 'Reptile';

export interface Cell { x: number; z: number }

export interface Ability {
  id: string;
  name: string;
  description: string;
  cost: number;
  range: number;
  damage: number;
  cooldown: number;
  kind: 'damage' | 'shield' | 'dash' | 'reveal';
}

export interface Unit {
  id: string;
  name: string;
  role: string;
  team: Team;
  cell: Cell;
  hp: number;
  maxHp: number;
  ap: number;
  maxAp: number;
  moveRange: number;
  attackRange: number;
  damage: number;
  vision: number;
  ability: Ability;
  cooldown: number;
  guarding: boolean;
  alive: boolean;
  asset?: string;
  /** The class-specific descriptor used by the official 3D mixer. */
  axieClass?: AxieClass;
  color: number;
}

export interface CombatEvent {
  id: number;
  type: 'move' | 'damage' | 'guard' | 'defeat' | 'phase' | 'ability';
  text: string;
  unitId?: string;
  targetId?: string;
  value?: number;
}

export interface GameState {
  width: number;
  height: number;
  phase: Phase;
  turn: number;
  units: Unit[];
  selectedId: string | null;
  actionMode: ActionMode;
  blocked: Set<string>;
  cover: Map<string, CoverLevel>;
  visibility: Map<string, Visibility>;
  events: CombatEvent[];
  eventSequence: number;
}

export type Command =
  | { type: 'select'; unitId: string }
  | { type: 'move'; unitId: string; to: Cell }
  | { type: 'attack'; unitId: string; targetId: string; ability?: boolean }
  | { type: 'guard'; unitId: string }
  | { type: 'end-turn' };
