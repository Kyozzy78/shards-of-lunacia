import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const source = join(root, 'node_modules', '@jaatster', 'threejs-axie-mixer3d-public', 'public', 'assets', 'axie');
const destination = join(root, 'public', 'assets', 'axie');

if (!existsSync(source)) {
  console.warn('Mixer package is not installed; skipping Axie content setup.');
  process.exit(0);
}
if (existsSync(join(destination, 'manifest.json'))) {
  console.log('Official mixer content is already available.');
  process.exit(0);
}
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
console.log('Copied the official mixer content required by the playable Axies.');
