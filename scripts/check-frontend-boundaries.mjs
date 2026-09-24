import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../frontend/apexpredict/src/app/', import.meta.url));
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    if (!file.endsWith('.ts')) continue;
    const own = relative(root, file).replaceAll('\\', '/');
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g)) {
      if (!match[1].startsWith('.')) continue;
      const target = relative(root, resolve(dirname(file), match[1])).replaceAll('\\', '/');
      if (own.startsWith('core/')) assert.ok(!target.startsWith('features/'), `${own} depende de una pantalla: ${target}`);
      if (own.startsWith('features/') && target.startsWith('features/')) {
        assert.equal(own.split('/')[1], target.split('/')[1], `${own} importa otra pantalla: ${target}`);
      }
    }
  }
}
scan(root);
console.log('PASS core no depende de features y cada pantalla es independiente.');
