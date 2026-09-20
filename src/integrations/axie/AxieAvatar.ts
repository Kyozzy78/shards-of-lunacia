import type * as THREE from 'three';

export interface AxieAvatar {
  readonly object: THREE.Object3D;
  readonly source: 'mixer3d' | 'official-glb' | 'procedural';
  play(name: 'idle' | 'move' | 'attack' | 'hit' | 'defeat'): void;
  update(delta: number): void;
  dispose(): void;
}
