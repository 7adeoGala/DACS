import { cpSync, mkdirSync, readFileSync } from 'node:fs';
const source = new URL('../frontend/apexpredict/dist/apexpredict/browser/', import.meta.url);
const destination = new URL('../frontend/www/apexpredict/', import.meta.url);
const html = readFileSync(new URL('index.html', source), 'utf8');
if (!html.includes('<base href="/apexpredict/">')) throw new Error('Compilar con --configuration=production --base-href=/apexpredict/ antes de publicar.');
mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });
console.log('Build publicado en frontend/www/apexpredict/ para Nginx.');
