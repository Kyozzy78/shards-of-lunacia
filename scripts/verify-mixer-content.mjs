import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'public', 'assets', 'axie');
const manifest = join(root, 'manifest.json');
if (!existsSync(manifest)) {
  console.warn('Mixer content is not copied. Run: npx axie-mixer-copy-assets public/assets/axie');
  process.exit(0);
}
JSON.parse(readFileSync(manifest, 'utf8'));
console.log('Mixer manifest is present and valid JSON. Run the vendored npm test:content for full hashes.');
