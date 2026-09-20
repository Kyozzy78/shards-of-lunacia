import * as THREE from 'three';
import type { Unit } from '../game/types';
import { AxieAvatarFactory } from '../integrations/axie/AxieAvatarFactory';
import type { AxieAvatar } from '../integrations/axie/AxieAvatar';

interface Preview { unit: Unit; avatar: AxieAvatar; element: HTMLElement }

/**
 * A single transparent WebGL canvas renders every roster portrait. Keeping one
 * renderer and one mixer cache prevents five card canvases from downloading the
 * same Axie material library independently.
 */
export class SquadPreviewRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
  private readonly scene = new THREE.Scene();
  private readonly factory: AxieAvatarFactory;
  private readonly clock = new THREE.Clock();
  private previews: Preview[] = [];
  private frameId = 0;
  private disposed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    // Viewports are derived from CSS card rectangles, so use one render pixel
    // per CSS pixel for exact alignment and a predictable mobile cost.
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setScissorTest(true);
    this.factory = new AxieAvatarFactory(this.renderer);
    this.scene.add(new THREE.HemisphereLight(0xe6f7ff, 0x204a61, 2.4));
    const key = new THREE.DirectionalLight(0xffe4b3, 3); key.position.set(3, 6, 5); this.scene.add(key);
    this.camera.position.set(0, 1.25, 4.25); this.camera.lookAt(0, .7, 0);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  async load(units: Unit[], elements: HTMLElement[]): Promise<void> {
    const pairs = units.map((unit, index) => ({ unit, element: elements[index] })).filter((pair): pair is { unit: Unit; element: HTMLElement } => Boolean(pair.element));
    const previews = await Promise.all(pairs.map(async ({ unit, element }) => {
      const avatar = await this.factory.create(unit);
      // Portraits are intentionally close enough to read as characters, not icons.
      avatar.object.scale.multiplyScalar(1.72);
      return { unit, element, avatar };
    }));
    if (this.disposed) { previews.forEach((preview) => preview.avatar.dispose()); return; }
    this.previews = previews;
    this.frame();
  }

  private resize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.renderer.setSize(rect.width, rect.height, false);
  };

  private frame = (): void => {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this.frame);
    const delta = Math.min(this.clock.getDelta(), .05);
    const canvasRect = this.canvas.getBoundingClientRect();
    this.renderer.clear();
    for (const preview of this.previews) {
      const rect = preview.element.getBoundingClientRect();
      const left = Math.round(rect.left - canvasRect.left);
      const bottom = Math.round(canvasRect.bottom - rect.bottom);
      const width = Math.round(rect.width); const height = Math.round(rect.height);
      if (width <= 0 || height <= 0 || left + width < 0 || bottom + height < 0 || left > canvasRect.width || bottom > canvasRect.height) continue;
      preview.avatar.update(delta); preview.avatar.object.rotation.y += delta * .34;
      this.scene.add(preview.avatar.object);
      this.camera.aspect = width / Math.max(1, height); this.camera.updateProjectionMatrix();
      this.renderer.setViewport(left, bottom, width, height); this.renderer.setScissor(left, bottom, width, height); this.renderer.clearDepth(); this.renderer.render(this.scene, this.camera);
      this.scene.remove(preview.avatar.object);
    }
  };

  dispose(): void {
    this.disposed = true; cancelAnimationFrame(this.frameId); window.removeEventListener('resize', this.resize);
    this.previews.forEach((preview) => preview.avatar.dispose()); this.factory.dispose(); this.renderer.dispose();
  }
}
