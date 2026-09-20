import { createUnits } from './data';
import { coverAt, distance, findPath, hasLineOfSight, keyOf, recalculateVisibility } from './grid';
import type { Cell, CombatEvent, Command, GameState, Unit } from './types';

export type MissionId = 'crossing' | 'canopy' | 'citadel';
const BLOCKED = ['5,0','5,1','8,1','3,2','4,2','8,2','9,2','3,3','6,3','6,4','9,4','3,5','8,5','8,6','5,7','6,7','10,7','5,8','10,9'];
const COVER: Array<[string, 'half' | 'full']> = [
  ['2,7','full'],['2,5','half'],['4,8','half'],['4,4','full'],['7,3','half'],['7,6','full'],['9,3','half'],['10,4','full'],['11,7','half'],['9,8','half'],
];
const MISSION_TERRAIN: Record<MissionId, { blocked: string[]; cover: Array<[string, 'half' | 'full']> }> = {
  crossing: { blocked: BLOCKED, cover: COVER },
  canopy: { blocked: [...BLOCKED.filter((key) => !['5,0', '8,1', '10,9'].includes(key)), '1,1', '2,2', '11,1', '12,2', '7,8'], cover: [...COVER, ['2,2', 'full'], ['11,1', 'full'], ['7,8', 'half']] },
  citadel: { blocked: [...BLOCKED.filter((key) => !['3,2', '6,4', '8,6'].includes(key)), '6,1', '7,1', '6,8', '7,8', '11,5'], cover: [...COVER, ['6,1', 'full'], ['7,8', 'full'], ['11,5', 'half']] },
};

export function createInitialState(mission: MissionId = 'crossing'): GameState {
  const terrain = MISSION_TERRAIN[mission];
  const state: GameState = {
    width: 14, height: 10, phase: 'PLAYER_PHASE', turn: 1, units: createUnits(), selectedId: 'kibo', actionMode: 'move',
    blocked: new Set(terrain.blocked), cover: new Map(terrain.cover), visibility: new Map(), events: [], eventSequence: 0,
  };
  state.visibility = recalculateVisibility(state);
  return state;
}

const cloneState = (state: GameState): GameState => ({
  ...state,
  units: state.units.map((u) => ({ ...u, cell: { ...u.cell }, ability: { ...u.ability } })),
  blocked: new Set(state.blocked), cover: new Map(state.cover), visibility: new Map(state.visibility), events: [...state.events],
});

function pushEvent(state: GameState, event: Omit<CombatEvent, 'id'>): void {
  state.eventSequence += 1;
  state.events = [{ id: state.eventSequence, ...event }, ...state.events].slice(0, 8);
}

function checkResult(state: GameState): void {
  if (!state.units.some((u) => u.team === 'enemy' && u.alive)) state.phase = 'VICTORY';
  if (!state.units.some((u) => u.team === 'player' && u.alive)) state.phase = 'DEFEAT';
}

export function getUnit(state: GameState, id: string): Unit | undefined { return state.units.find((u) => u.id === id); }

export function targetLegal(state: GameState, attacker: Unit, target: Unit, ability = false): boolean {
  if (!attacker.alive || !target.alive || attacker.team === target.team) return false;
  const range = ability ? attacker.ability.range : attacker.attackRange;
  const cost = ability ? attacker.ability.cost : 1;
  return attacker.ap >= cost && (!ability || attacker.cooldown === 0) && distance(attacker.cell, target.cell) <= range && hasLineOfSight(state, attacker.cell, target.cell);
}

export function applyCommand(source: GameState, command: Command): { state: GameState; error?: string } {
  const state = cloneState(source);
  if (state.phase === 'VICTORY' || state.phase === 'DEFEAT') return { state: source, error: 'The encounter is over.' };
  if (command.type === 'select') {
    const unit = getUnit(state, command.unitId);
    if (!unit?.alive || unit.team !== 'player' || state.phase !== 'PLAYER_PHASE') return { state: source, error: 'That unit cannot be selected.' };
    state.selectedId = unit.id; state.actionMode = 'move'; return { state };
  }
  if (command.type === 'end-turn') return { state: beginEnemyPhase(state) };
  const unit = getUnit(state, command.unitId);
  if (!unit?.alive) return { state: source, error: 'Unit is unavailable.' };
  if (command.type === 'move') {
    if (unit.ap < 1) return { state: source, error: 'Not enough AP.' };
    const path = findPath(state, unit.cell, command.to, unit.id);
    if (!path || path.length < 1 || path.length > unit.moveRange) return { state: source, error: 'Destination is unreachable.' };
    unit.cell = { ...command.to }; unit.ap -= 1;
    pushEvent(state, { type: 'move', text: `${unit.name} moved · −1 AP`, unitId: unit.id });
    state.visibility = recalculateVisibility(state);
    return { state };
  }
  if (command.type === 'guard') {
    if (unit.ap < 1) return { state: source, error: 'Not enough AP.' };
    unit.ap -= 1; unit.guarding = true;
    pushEvent(state, { type: 'guard', text: `${unit.name} is guarding`, unitId: unit.id });
    return { state };
  }
  const target = getUnit(state, command.targetId);
  if (!target || !targetLegal(state, unit, target, command.ability)) return { state: source, error: 'Target is blocked, out of range, or the action is unavailable.' };
  const ability = command.ability ? unit.ability : null;
  unit.ap -= ability?.cost ?? 1;
  if (ability) unit.cooldown = ability.cooldown + 1;
  let damage = ability?.damage ?? unit.damage;
  if (ability?.kind !== 'damage' && unit.id !== 'bing') {
    const cover = coverAt(state, target);
    if (cover === 'half') damage = Math.max(1, damage - 4);
    if (cover === 'full') damage = Math.max(1, damage - 8);
  }
  if (target.guarding) damage = Math.ceil(damage * 0.6);
  target.hp = Math.max(0, target.hp - damage);
  target.alive = target.hp > 0;
  pushEvent(state, { type: ability ? 'ability' : 'damage', text: `${unit.name} ${ability ? `used ${ability.name}` : 'attacked'} · ${damage} damage`, unitId: unit.id, targetId: target.id, value: damage });
  if (!target.alive) pushEvent(state, { type: 'defeat', text: `${target.name} was defeated`, unitId: target.id });
  checkResult(state);
  state.visibility = recalculateVisibility(state);
  return { state };
}

export function useSelfAbility(source: GameState, unitId: string): { state: GameState; error?: string } {
  const state = cloneState(source); const unit = getUnit(state, unitId);
  if (!unit || unit.ability.kind !== 'shield' || unit.ap < unit.ability.cost || unit.cooldown > 0) return { state: source, error: 'Ability is unavailable.' };
  unit.ap -= unit.ability.cost; unit.cooldown = unit.ability.cooldown + 1; unit.hp = Math.min(unit.maxHp, unit.hp - unit.ability.damage); unit.guarding = true;
  pushEvent(state, { type: 'ability', text: `${unit.name} used ${unit.ability.name} · +${-unit.ability.damage} HP`, unitId });
  return { state };
}

export function beginEnemyPhase(state: GameState): GameState {
  const next = cloneState(state); next.phase = 'ENEMY_PHASE'; next.actionMode = null; next.selectedId = null;
  for (const unit of next.units.filter((u) => u.team === 'enemy' && u.alive)) { unit.ap = unit.maxAp; unit.guarding = false; unit.cooldown = Math.max(0, unit.cooldown - 1); }
  pushEvent(next, { type: 'phase', text: 'Enemy phase' }); return next;
}

export function beginPlayerPhase(state: GameState): GameState {
  const next = cloneState(state); next.phase = 'PLAYER_PHASE'; next.turn += 1;
  for (const unit of next.units.filter((u) => u.team === 'player' && u.alive)) { unit.ap = unit.maxAp; unit.guarding = false; unit.cooldown = Math.max(0, unit.cooldown - 1); }
  next.selectedId = next.units.find((u) => u.team === 'player' && u.alive)?.id ?? null; next.actionMode = 'move'; next.visibility = recalculateVisibility(next);
  pushEvent(next, { type: 'phase', text: `Player phase · turn ${next.turn}` }); return next;
}

export function chooseEnemyAction(state: GameState, enemy: Unit): Command {
  const targets = state.units.filter((u) => u.team === 'player' && u.alive).sort((a, b) => (a.hp - b.hp) || distance(enemy.cell, a.cell) - distance(enemy.cell, b.cell));
  const legal = targets.find((target) => targetLegal(state, enemy, target));
  if (legal) return { type: 'attack', unitId: enemy.id, targetId: legal.id };
  const target = targets[0];
  if (!target) return { type: 'end-turn' };
  const candidates: Array<{ cell: Cell; path: Cell[]; score: number }> = [];
  for (let x = 0; x < state.width; x += 1) for (let z = 0; z < state.height; z += 1) {
    const cell = { x, z }; const path = findPath(state, enemy.cell, cell, enemy.id);
    if (path && path.length > 0 && path.length <= enemy.moveRange) candidates.push({ cell, path, score: -distance(cell, target.cell) + (state.cover.has(keyOf(cell)) ? 2 : 0) });
  }
  candidates.sort((a, b) => b.score - a.score || a.path.length - b.path.length || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
  return candidates[0] ? { type: 'move', unitId: enemy.id, to: candidates[0].cell } : { type: 'end-turn' };
}
