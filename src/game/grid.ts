import type { Cell, GameState, Unit, Visibility } from './types';

export const keyOf = ({ x, z }: Cell): string => `${x},${z}`;
export const sameCell = (a: Cell, b: Cell): boolean => a.x === b.x && a.z === b.z;
export const distance = (a: Cell, b: Cell): number => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);

export function neighbors(cell: Cell, width: number, height: number): Cell[] {
  return [
    { x: cell.x + 1, z: cell.z }, { x: cell.x - 1, z: cell.z },
    { x: cell.x, z: cell.z + 1 }, { x: cell.x, z: cell.z - 1 },
  ].filter((c) => c.x >= 0 && c.z >= 0 && c.x < width && c.z < height);
}

export function occupiedKeys(state: GameState, exceptId?: string): Set<string> {
  return new Set(state.units.filter((u) => u.alive && u.id !== exceptId).map((u) => keyOf(u.cell)));
}

export function findPath(state: GameState, from: Cell, to: Cell, movingId?: string): Cell[] | null {
  const start = keyOf(from);
  const goal = keyOf(to);
  const occupied = occupiedKeys(state, movingId);
  if (state.blocked.has(goal) || occupied.has(goal)) return null;
  const frontier: Cell[] = [from];
  const cameFrom = new Map<string, Cell | null>([[start, null]]);
  while (frontier.length) {
    // Equal-cost grid: FIFO breadth-first search guarantees a shortest path.
    const current = frontier.shift();
    if (!current) break;
    if (sameCell(current, to)) break;
    for (const next of neighbors(current, state.width, state.height)) {
      const key = keyOf(next);
      if (cameFrom.has(key) || state.blocked.has(key) || occupied.has(key)) continue;
      cameFrom.set(key, current);
      frontier.push(next);
    }
  }
  if (!cameFrom.has(goal)) return null;
  const path: Cell[] = [];
  let cursor: Cell | null = to;
  while (cursor && keyOf(cursor) !== start) {
    path.unshift(cursor);
    cursor = cameFrom.get(keyOf(cursor)) ?? null;
  }
  return path;
}

export function reachableCells(state: GameState, unit: Unit): Cell[] {
  const result: Cell[] = [];
  for (let x = 0; x < state.width; x += 1) {
    for (let z = 0; z < state.height; z += 1) {
      const to = { x, z };
      const path = findPath(state, unit.cell, to, unit.id);
      if (path && path.length > 0 && path.length <= unit.moveRange) result.push(to);
    }
  }
  return result;
}

// Supercover-style integer line. Blocking cells stop sight before the target.
export function hasLineOfSight(state: GameState, from: Cell, to: Cell): boolean {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const steps = Math.max(Math.abs(dx), Math.abs(dz));
  for (let i = 1; i < steps; i += 1) {
    const cell = { x: Math.round(from.x + (dx * i) / steps), z: Math.round(from.z + (dz * i) / steps) };
    if (state.blocked.has(keyOf(cell))) return false;
  }
  return true;
}

export function coverAt(state: GameState, defender: Unit): 'none' | 'half' | 'full' {
  return state.cover.get(keyOf(defender.cell)) ?? 'none';
}

export function recalculateVisibility(state: GameState): Map<string, Visibility> {
  const next = new Map(state.visibility);
  for (const key of next.keys()) if (next.get(key) === 'visible') next.set(key, 'explored');
  for (const unit of state.units.filter((u) => u.alive && u.team === 'player')) {
    for (let x = 0; x < state.width; x += 1) {
      for (let z = 0; z < state.height; z += 1) {
        const cell = { x, z };
        if (distance(unit.cell, cell) <= unit.vision && hasLineOfSight(state, unit.cell, cell)) next.set(keyOf(cell), 'visible');
      }
    }
  }
  return next;
}
