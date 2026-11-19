import { cpSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
const source = new URL('../frontend/apexpredict/dist/apexpredict/browser/', import.meta.url);
const destination = new URL('../frontend/www/apexpredict/', import.meta.url);
const html = readFileSync(new URL('index.html', source), 'utf8');
if (!html.includes('<base href="/apexpredict/">')) throw new Error('Compilar con --configuration=production,local --base-href=/apexpredict/ antes de publicar.');
const scripts = readdirSync(source).filter(name => name.endsWith('.js'))
  .map(name => readFileSync(new URL(name, source), 'utf8'));
if (!scripts.some(script => script.includes('https://dacs2026.local/api')) ||
    scripts.some(script => script.includes('https://dacs-2-2q62.onrender.com/bff'))) {
  throw new Error('Nginx local requiere el build --configuration=production,local.');
}
mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });
console.log('Build publicado en frontend/www/apexpredict/ para Nginx.');
