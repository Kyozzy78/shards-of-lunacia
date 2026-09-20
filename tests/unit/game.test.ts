import { describe, expect, it } from 'vitest';
import { applyCommand, beginPlayerPhase, chooseEnemyAction, createInitialState, getUnit, targetLegal, useSelfAbility } from '../../src/game/engine';
import { coverAt, distance, findPath, hasLineOfSight, keyOf, reachableCells, recalculateVisibility, sameCell } from '../../src/game/grid';
import type { Command } from '../../src/game/types';

describe('grid coordinates and paths', () => {
  it('uses stable keys and Manhattan distance', () => {
    expect(keyOf({ x: 2, z: 7 })).toBe('2,7');
    expect(distance({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(7);
    expect(sameCell({ x: 1, z: 2 }, { x: 1, z: 2 })).toBe(true);
  });

  it('routes around blocked and occupied cells', () => {
    const state = createInitialState();
    expect(findPath(state, { x: 2, z: 2 }, { x: 3, z: 2 })).toBeNull();
    expect(findPath(state, { x: 1, z: 7 }, { x: 1, z: 5 }, 'kibo')).toBeNull();
    const path = findPath(state, { x: 1, z: 7 }, { x: 2, z: 7 }, 'kibo');
    expect(path).toEqual([{ x: 2, z: 7 }]);
  });

  it('limits reachable cells by move range', () => {
    const state = createInitialState(); const kibo = getUnit(state, 'kibo')!;
    expect(reachableCells(state, kibo).every((cell) => (findPath(state, kibo.cell, cell, kibo.id)?.length ?? 99) <= kibo.moveRange)).toBe(true);
  });
});

describe('AP and phases', () => {
  it('creates all five requested official-mixer class roles', () => {
    const players = createInitialState().units.filter((unit) => unit.team === 'player');
    expect(players.map((unit) => unit.axieClass)).toEqual(['Beast', 'Reptile', 'Bird', 'Reptile', 'Plant']);
    expect(players).toHaveLength(5);
  });

  it('uses distinct deterministic terrain for each campaign mission', () => {
    const crossing = createInitialState('crossing');
    const canopy = createInitialState('canopy');
    const citadel = createInitialState('citadel');
    expect(canopy.blocked).not.toEqual(crossing.blocked);
    expect(citadel.blocked).not.toEqual(crossing.blocked);
    expect(canopy.cover.size).toBeGreaterThan(crossing.cover.size);
  });

  it('spends exactly one AP on a legal move and prevents overspend', () => {
    let state = createInitialState();
    state = applyCommand(state, { type: 'move', unitId: 'kibo', to: { x: 2, z: 7 } }).state;
    expect(getUnit(state, 'kibo')?.ap).toBe(2);
    getUnit(state, 'kibo')!.ap = 0;
    const result = applyCommand(state, { type: 'move', unitId: 'kibo', to: { x: 2, z: 6 } });
    expect(result.error).toMatch(/AP/); expect(getUnit(result.state, 'kibo')?.cell).toEqual({ x: 2, z: 7 });
  });

  it('refreshes living player AP and cooldown on player phase', () => {
    const state = createInitialState(); const kibo = getUnit(state, 'kibo')!; kibo.ap = 0; kibo.cooldown = 2; kibo.guarding = true;
    const next = beginPlayerPhase(state);
    expect(getUnit(next, 'kibo')).toMatchObject({ ap: 3, cooldown: 1, guarding: false });
    expect(next.turn).toBe(2); expect(next.phase).toBe('PLAYER_PHASE');
  });
});

describe('combat rules', () => {
  it('rejects range and line-of-sight violations', () => {
    const state = createInitialState(); const kibo = getUnit(state, 'kibo')!; const brute = getUnit(state, 'brute')!;
    expect(targetLegal(state, kibo, brute)).toBe(false);
    kibo.cell = { x: 2, z: 2 }; brute.cell = { x: 4, z: 2 }; kibo.attackRange = 4;
    expect(hasLineOfSight(state, kibo.cell, brute.cell)).toBe(false);
    expect(targetLegal(state, kibo, brute)).toBe(false);
  });

  it('finds configured half/full cover', () => {
    const state = createInitialState(); const kibo = getUnit(state, 'kibo')!;
    kibo.cell = { x: 2, z: 7 }; expect(coverAt(state, kibo)).toBe('full');
    kibo.cell = { x: 2, z: 5 }; expect(coverAt(state, kibo)).toBe('half');
  });

  it('applies damage, guard reduction, defeat, and victory', () => {
    let state = createInitialState(); const bing = getUnit(state, 'bing')!; const brute = getUnit(state, 'brute')!;
    bing.cell = { x: 8, z: 3 }; brute.cell = { x: 10, z: 3 }; brute.hp = 10; brute.guarding = true;
    getUnit(state, 'hunter')!.alive = false; getUnit(state, 'spitter')!.alive = false;
    state = applyCommand(state, { type: 'attack', unitId: bing.id, targetId: brute.id }).state;
    expect(getUnit(state, 'brute')?.alive).toBe(false); expect(state.phase).toBe('VICTORY');
  });

  it('ticks and enforces signature cooldowns', () => {
    let state = createInitialState(); const kibo = getUnit(state, 'kibo')!; kibo.hp = 80;
    const result = useSelfAbility(state, 'kibo'); state = result.state;
    expect(getUnit(state, 'kibo')).toMatchObject({ hp: 96, ap: 1, cooldown: 3, guarding: true });
    expect(useSelfAbility(state, 'kibo').error).toBeTruthy();
  });
});

describe('fog and AI', () => {
  it('moves visible cells to explored and never exposes distant enemies', () => {
    const state = createInitialState(); const visible = recalculateVisibility(state); state.visibility = visible;
    expect(visible.get(keyOf(getUnit(state, 'kibo')!.cell))).toBe('visible');
    expect(visible.get(keyOf(getUnit(state, 'brute')!.cell))).not.toBe('visible');
    for (const player of state.units.filter((u) => u.team === 'player')) player.cell = { x: 0, z: 9 };
    const next = recalculateVisibility(state); expect([...next.values()]).toContain('explored');
  });

  it('returns a legal deterministic command or pass', () => {
    const state = createInitialState(); const enemy = getUnit(state, 'brute')!;
    const a = chooseEnemyAction(state, enemy); const b = chooseEnemyAction(state, enemy);
    expect(a).toEqual(b);
    if (a.type === 'move') expect(findPath(state, enemy.cell, a.to, enemy.id)).not.toBeNull();
    if (a.type === 'attack') expect(targetLegal(state, enemy, getUnit(state, a.targetId)!)).toBe(true);
    expect(['move', 'attack', 'end-turn']).toContain(a.type);
  });

  it('never returns an unknown command during a simulated phase', () => {
    let state = createInitialState();
    for (const enemy of state.units.filter((u) => u.team === 'enemy')) {
      const command: Command = chooseEnemyAction(state, enemy); expect(command).toBeDefined();
      if (command.type !== 'end-turn') state = applyCommand(state, command).state;
    }
  });
});
