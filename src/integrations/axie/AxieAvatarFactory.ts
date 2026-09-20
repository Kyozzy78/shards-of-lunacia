import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Unit } from '../../game/types';
import type { AxieAvatar } from './AxieAvatar';
import { animationAliases } from './animationMap';

type MixerRuntime = { create(request: { descriptor: unknown; quality: 'balanced'; artMode: 'faithful'; strict: true }): Promise<{ wrapper: THREE.Object3D; update(delta: number): void; dispose(): void; playAnimation(name: string): boolean }>; dispose(): void };

const classVariant: Record<NonNullable<Unit['axieClass']>, number> = { Beast: 2, Bird: 4, Plant: 8, Reptile: 10 };
const partOrder = ['eye', 'mouth', 'ear', 'horn', 'back', 'tail'] as const;

export function classDescriptor(axieClass: NonNullable<Unit['axieClass']>): object {
  const variant = classVariant[axieClass];
  return { colorVariant: 0, body: 'normal', parts: partOrder.map((type) => ({ type, skin: 0, class: axieClass, variant, level: 1 })) };
}

class GlbAvatar implements AxieAvatar {
  readonly source = 'official-glb' as const;
  private readonly mixer: THREE.AnimationMixer;
  private active?: THREE.AnimationAction;
  private returnToIdle = 0;
  constructor(readonly object: THREE.Object3D, private readonly clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(object); this.play('idle');
  }
  play(name: keyof typeof animationAliases): void {
    const aliases = animationAliases[name];
    const clip = this.clips.find((item) => aliases.some((alias) => item.name.toLowerCase() === alias.toLowerCase()));
    if (!clip) return;
    const next = this.mixer.clipAction(clip); next.reset(); next.enabled = true;
    if (name === 'idle' || name === 'move') next.setLoop(THREE.LoopRepeat, Infinity); else { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; }
    this.returnToIdle = name === 'attack' || name === 'hit' ? clip.duration : 0;
    this.active?.fadeOut(0.15); next.fadeIn(0.15).play(); this.active = next;
  }
  update(delta: number): void { this.mixer.update(delta); if (this.returnToIdle > 0) { this.returnToIdle -= delta; if (this.returnToIdle <= 0) this.play('idle'); } }
  dispose(): void { this.mixer.stopAllAction(); this.object.traverse(disposeObject); }
}

class MixerAvatar implements AxieAvatar {
  readonly source = 'mixer3d' as const;
  constructor(
    readonly object: THREE.Object3D,
    private readonly character: { update(delta: number): void; dispose(): void; playAnimation(name: string): boolean },
  ) {}
  play(name: keyof typeof animationAliases): void { this.character.playAnimation(name === 'move' ? 'Run' : name === 'attack' ? 'Attack' : name === 'defeat' ? 'Dead' : 'Idle'); }
  update(delta: number): void { this.character.update(delta); }
  dispose(): void { this.character.dispose(); }
}

function disposeObject(object: THREE.Object3D): void {
  const mesh = object as THREE.Mesh;
  mesh.geometry?.dispose();
  if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose()); else mesh.material?.dispose();
}

export class AxieAvatarFactory {
  private readonly loader = new GLTFLoader();
  private runtime?: MixerRuntime;
  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  async create(unit: Unit): Promise<AxieAvatar> {
    // Every player unit is assembled from a class-specific official mixer descriptor.
    // This keeps Beast, Bird, Plant and Reptile silhouettes truthful to the selected role.
    if (unit.axieClass) {
      const module = await import('@jaatster/threejs-axie-mixer3d-public');
      this.runtime ??= await module.createAxieMixer3D({ renderer: this.renderer, assetBaseUrl: './assets/axie/' }) as MixerRuntime;
      const character = await this.runtime.create({ descriptor: classDescriptor(unit.axieClass), quality: 'balanced', artMode: 'faithful', strict: true });
      character.wrapper.scale.setScalar(0.75);
      return new MixerAvatar(character.wrapper, character);
    }
    if (unit.asset) {
      const gltf = await this.loader.loadAsync(`./assets/characters/${unit.asset}`);
      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      const height = bounds.getSize(new THREE.Vector3()).y;
      gltf.scene.scale.setScalar(1.3 / Math.max(height, .01));
      const scaled = new THREE.Box3().setFromObject(gltf.scene);
      const center = scaled.getCenter(new THREE.Vector3());
      gltf.scene.position.set(-center.x, -scaled.min.y, -center.z);
      gltf.scene.traverse((child) => { child.castShadow = true; child.receiveShadow = true; });
      return new GlbAvatar(gltf.scene, gltf.animations);
    }
    throw new Error(`No Axie asset configured for ${unit.id}`);
  }

  dispose(): void { this.runtime?.dispose(); this.runtime = undefined; }
}
