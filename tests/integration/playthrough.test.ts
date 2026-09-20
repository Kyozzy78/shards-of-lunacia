import { describe, expect, it } from 'vitest';
import { applyCommand, beginPlayerPhase, chooseEnemyAction, createInitialState, getUnit, targetLegal, useSelfAbility } from '../../src/game/engine';
import { distance, reachableCells } from '../../src/game/grid';
import type { GameState, Unit } from '../../src/game/types';

type Opening = 'aggressive' | 'cover-first' | 'focus-spitter';

function pickTarget(state: GameState, unit: Unit, opening: Opening): Unit | undefined {
  const enemies = state.units.filter((candidate) => candidate.team === 'enemy' && candidate.alive);
  return [...enemies].sort((a, b) => {
    const aPriority = opening === 'focus-spitter' && a.id === 'spitter' ? -100 : 0;
    const bPriority = opening === 'focus-spitter' && b.id === 'spitter' ? -100 : 0;
    return (aPriority - bPriority) || distance(unit.cell, a.cell) - distance(unit.cell, b.cell) || a.hp - b.hp;
  })[0];
}

function playPlayerUnit(state: GameState, unitId: string, opening: Opening): GameState {
  let next = state;
  for (let actions = 0; actions < 3; actions += 1) {
    const unit = getUnit(next, unitId);
    if (!unit?.alive || unit.ap === 0) break;
    if (unit.ability.kind === 'shield' && opening === 'cover-first' && unit.hp < unit.maxHp - 10 && unit.cooldown === 0) {
      next = useSelfAbility(next, unit.id).state;
      continue;
    }
    const legalEnemies = next.units.filter((candidate) => candidate.team === 'enemy' && targetLegal(next, unit, candidate));
    const abilityTarget = legalEnemies.find((candidate) => unit.cooldown === 0 && targetLegal(next, unit, candidate, true));
    if (abilityTarget && (opening === 'aggressive' || opening === 'focus-spitter')) {
      next = applyCommand(next, { type: 'attack', unitId, targetId: abilityTarget.id, ability: true }).state;
      continue;
    }
    if (legalEnemies[0]) {
      next = applyCommand(next, { type: 'attack', unitId, targetId: legalEnemies[0].id }).state;
      continue;
    }
    const target = pickTarget(next, unit, opening);
    const destination = reachableCells(next, unit)
      .map((cell) => ({ cell, score: target ? distance(cell, target.cell) - (next.cover.has(`${cell.x},${cell.z}`) ? 0.5 : 0) : 0 }))
      .sort((a, b) => a.score - b.score || a.cell.x - b.cell.x || a.cell.z - b.cell.z)[0]?.cell;
    if (!destination) break;
    next = applyCommand(next, { type: 'move', unitId, to: destination }).state;
  }
  return next;
}

function playEncounter(opening: Opening): GameState {
  let state = createInitialState();
  for (let turn = 0; turn < 28 && state.phase !== 'VICTORY' && state.phase !== 'DEFEAT'; turn += 1) {
    for (const unit of state.units.filter((candidate) => candidate.team === 'player' && candidate.alive)) state = playPlayerUnit(state, unit.id, opening);
    state = applyCommand(state, { type: 'end-turn' }).state;
    for (const enemyId of state.units.filter((candidate) => candidate.team === 'enemy' && candidate.alive).map((enemy) => enemy.id)) {
      for (let action = 0; action < 2 && state.phase === 'ENEMY_PHASE'; action += 1) {
        const enemy = getUnit(state, enemyId);
        if (!enemy?.alive || enemy.ap < 1) break;
        const command = chooseEnemyAction(state, enemy);
        if (command.type === 'end-turn') break;
        const result = applyCommand(state, command);
        expect(result.error).toBeUndefined();
        state = result.state;
      }
    }
    if (state.phase === 'ENEMY_PHASE') state = beginPlayerPhase(state);
  }
  return state;
}

describe('complete deterministic playthroughs', () => {
  it.each<Opening>(['aggressive', 'cover-first', 'focus-spitter'])('%s opening reaches a terminal result without a deadlock', (opening) => {
    const result = playEncounter(opening);
    expect(['VICTORY', 'DEFEAT']).toContain(result.phase);
    expect(result.turn).toBeLessThanOrEqual(29);
  });

  it('the aggressive opening clears the encounter', () => {
    expect(playEncounter('aggressive').phase).toBe('VICTORY');
  });
});
