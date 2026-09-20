import type { Unit } from './types';

const abilities = {
  kibo: { id: 'bark-shield', name: 'Bark Shield', description: 'Brace and restore 16 HP.', cost: 2, range: 0, damage: -16, cooldown: 2, kind: 'shield' as const },
  xia: { id: 'feral-charge', name: 'Feral Charge', description: 'A crushing close strike for 32.', cost: 2, range: 2, damage: 32, cooldown: 2, kind: 'dash' as const },
  bing: { id: 'piercing-shot', name: 'Piercing Shot', description: 'Long shot that ignores cover.', cost: 2, range: 7, damage: 27, cooldown: 2, kind: 'damage' as const },
  riptide: { id: 'scale-rush', name: 'Scale Rush', description: 'A swift reptile lunge for 28.', cost: 2, range: 2, damage: 28, cooldown: 2, kind: 'dash' as const },
  moss: { id: 'verdant-ward', name: 'Verdant Ward', description: 'Restore 14 HP and brace.', cost: 2, range: 0, damage: -14, cooldown: 2, kind: 'shield' as const },
  brute: { id: 'crushing-blow', name: 'Crushing Blow', description: 'Heavy melee attack.', cost: 2, range: 1, damage: 26, cooldown: 1, kind: 'damage' as const },
  hunter: { id: 'pounce', name: 'Pounce', description: 'Fast flanking strike.', cost: 2, range: 2, damage: 22, cooldown: 1, kind: 'dash' as const },
  spitter: { id: 'crystal-spit', name: 'Crystal Spit', description: 'Corrupted ranged attack.', cost: 2, range: 6, damage: 20, cooldown: 1, kind: 'damage' as const },
};

export const createUnits = (): Unit[] => [
  { id: 'kibo', name: 'Beast Axie', role: 'Vanguard', team: 'player', cell: { x: 1, z: 7 }, hp: 120, maxHp: 120, ap: 3, maxAp: 3, moveRange: 4, attackRange: 1, damage: 20, vision: 6, ability: abilities.kibo, cooldown: 0, guarding: false, alive: true, axieClass: 'Beast', color: 0x68c77c },
  { id: 'xia', name: 'Reptile Axie', role: 'Striker', team: 'player', cell: { x: 3, z: 8 }, hp: 92, maxHp: 92, ap: 3, maxAp: 3, moveRange: 5, attackRange: 1, damage: 25, vision: 6, ability: abilities.xia, cooldown: 0, guarding: false, alive: true, axieClass: 'Reptile', color: 0xf59f45 },
  { id: 'bing', name: 'Bird Axie', role: 'Ranged Scout', team: 'player', cell: { x: 1, z: 5 }, hp: 78, maxHp: 78, ap: 3, maxAp: 3, moveRange: 4, attackRange: 6, damage: 18, vision: 8, ability: abilities.bing, cooldown: 0, guarding: false, alive: true, axieClass: 'Bird', color: 0x84c9f5 },
  { id: 'riptide', name: 'Reptile Scout', role: 'Flanker', team: 'player', cell: { x: 3, z: 6 }, hp: 88, maxHp: 88, ap: 3, maxAp: 3, moveRange: 5, attackRange: 1, damage: 22, vision: 7, ability: abilities.riptide, cooldown: 0, guarding: false, alive: true, axieClass: 'Reptile', color: 0x9f8ce8 },
  { id: 'moss', name: 'Plant Axie', role: 'Warden', team: 'player', cell: { x: 1, z: 9 }, hp: 112, maxHp: 112, ap: 3, maxAp: 3, moveRange: 3, attackRange: 1, damage: 18, vision: 6, ability: abilities.moss, cooldown: 0, guarding: false, alive: true, axieClass: 'Plant', color: 0x76c979 },
  { id: 'brute', name: 'Chimera Brute', role: 'Tank', team: 'enemy', cell: { x: 11, z: 3 }, hp: 108, maxHp: 108, ap: 3, maxAp: 3, moveRange: 3, attackRange: 1, damage: 23, vision: 7, ability: abilities.brute, cooldown: 0, guarding: false, alive: true, color: 0x7c2942 },
  { id: 'hunter', name: 'Chimera Hunter', role: 'Flanker', team: 'enemy', cell: { x: 12, z: 7 }, hp: 72, maxHp: 72, ap: 3, maxAp: 3, moveRange: 5, attackRange: 1, damage: 20, vision: 7, ability: abilities.hunter, cooldown: 0, guarding: false, alive: true, color: 0xa6384c },
  { id: 'spitter', name: 'Chimera Spitter', role: 'Ranged Threat', team: 'enemy', cell: { x: 10, z: 8 }, hp: 66, maxHp: 66, ap: 3, maxAp: 3, moveRange: 3, attackRange: 6, damage: 17, vision: 8, ability: abilities.spitter, cooldown: 0, guarding: false, alive: true, color: 0xbd5266 },
];
