import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const ca = readFileSync(new URL('../infra/certs/generated/dacs2026.local.pem', import.meta.url));
const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(line => /^[A-Z][A-Z0-9_]*=/.test(line))
  .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));

function request(path, { secure = true, method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = (secure ? https : http).request({
      hostname: 'dacs2026.local', port: secure ? 443 : 80, path,
      ca, rejectUnauthorized: true, method, headers, timeout: 15000,
    }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error(`Timeout: ${path}`)));
    req.on('error', reject);
    req.end(body);
  });
}

const cases = [
  ['HTTP redirige a HTTPS conservando ruta y query', async () => {
    const res = await request('/api/health?probe=redirect', { secure: false });
    assert.equal(res.status, 301);
    assert.equal(res.headers.location, 'https://dacs2026.local/api/health?probe=redirect');
  }],
  ['HTTPS valida el certificado y sirve el frontend', async () => {
    const root = await request('/');
    assert.equal(root.status, 302);
    const res = await request('/apexpredict/');
    assert.equal(res.status, 200);
    assert.match(res.text, /ApexPredict/);
  }],
  ['Las rutas Angular tienen fallback y los assets ausentes dan 404', async () => {
    for (const route of ['/apexpredict/dashboard', '/apexpredict/admin']) {
      const res = await request(route);
      assert.equal(res.status, 200);
      assert.match(res.text, /ApexPredict/);
    }
    assert.equal((await request('/apexpredict/missing.js')).status, 404);
    assert.equal((await request('/apexpredict/missing.css')).status, 404);
  }],
  ['La API llega al BFF y responde a los pings de los 3 microservicios', async () => {
    const health = await request('/api/health?probe=bff');
    assert.equal(health.status, 200);
    assert.deepEqual(JSON.parse(health.text), { service: 'apexpredict-bff', status: 'UP' });

    const bffPing = await request('/api/ping');
    assert.equal(bffPing.status, 200);
    assert.deepEqual(JSON.parse(bffPing.text), { service: 'apexpredict-bff', status: 'UP' });

    const backendPing = await request('/api/backendping');
    assert.equal(backendPing.status, 200);
    assert.deepEqual(JSON.parse(backendPing.text), { service: 'apexpredict-domain-service', status: 'UP' });

    const conectorPing = await request('/api/conectorping');
    assert.equal(conectorPing.status, 200);
    assert.deepEqual(JSON.parse(conectorPing.text), { service: 'apexpredict-f1-connector', status: 'UP' });

    const missing = await request('/api/no-such-route.json');
    assert.equal(missing.status, 401);
    assert.equal((await request('/api/health', { method: 'POST' })).status, 401);
  }],
  ['Keycloak anuncia el issuer HTTPS publico sin aceptar cabeceras falsificadas', async () => {
    const res = await request('/auth/realms/apexpredict/.well-known/openid-configuration', {
      headers: { 'X-Forwarded-Host': 'attacker.invalid', 'X-Forwarded-Proto': 'http' },
    });
    assert.equal(res.status, 200);
    const discovery = JSON.parse(res.text);
    assert.equal(discovery.issuer, 'https://dacs2026.local/auth/realms/apexpredict');
    assert.ok(discovery.authorization_endpoint.startsWith(discovery.issuer + '/'));
  }],
  ['El login OIDC y sus recursos pasan por /auth/', async () => {
    const query = new URLSearchParams({ client_id: 'apexpredict-web', response_type: 'code',
      scope: 'openid', redirect_uri: 'https://dacs2026.local/apexpredict/',
      code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM', code_challenge_method: 'S256' });
    const res = await request(`/auth/realms/apexpredict/protocol/openid-connect/auth?${query}`);
    assert.equal(res.status, 200);
    assert.match(res.text, /kc-form-login/);
    assert.match(res.text, /login-actions\/registration\?/, 'El login ofrece registro de cuentas');
    const css = res.text.match(/href="([^"]*\/auth\/resources\/[^"?]+\.css[^\"]*)"/);
    assert.ok(css, 'No se encontro CSS de Keycloak en /auth/resources/');
    const url = new URL(css[1].replaceAll('&amp;', '&'), 'https://dacs2026.local');
    const asset = await request(url.pathname + url.search);
    assert.equal(asset.status, 200);
    assert.match(asset.headers['content-type'], /text\/css/);
  }],
  ['pgAdmin funciona bajo /pgadmin/ y sirve sus assets', async () => {
    const res = await request('/pgadmin/login');
    assert.equal(res.status, 200);
    assert.match(res.text, /pgAdmin/);
    const css = res.text.match(/href="([^"?]*\/pgadmin\/static\/[^"?]+\.css[^\"]*)"/);
    assert.ok(css, 'No se encontro CSS de pgAdmin bajo /pgadmin/');
    const url = new URL(css[1].replaceAll('&amp;', '&'), 'https://dacs2026.local');
    assert.equal((await request(url.pathname + url.search)).status, 200);
  }],
  ['Realm, roles y cliente PKCE se importaron correctamente', async () => {
    const body = new URLSearchParams({ client_id: 'admin-cli', grant_type: 'password',
      username: env.KEYCLOAK_ADMIN, password: env.KEYCLOAK_ADMIN_PASSWORD }).toString();
    const tokenRes = await request('/auth/realms/master/protocol/openid-connect/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    assert.equal(tokenRes.status, 200, 'Login administrativo de Keycloak');
    const headers = { Authorization: `Bearer ${JSON.parse(tokenRes.text).access_token}` };
    const roles = await request('/auth/admin/realms/apexpredict/roles', { headers });
    assert.equal(roles.status, 200);
    const names = JSON.parse(roles.text).map(role => role.name);
    assert.ok(names.includes('player') && names.includes('admin'));
    const clients = await request('/auth/admin/realms/apexpredict/clients?clientId=apexpredict-web', { headers });
    assert.equal(clients.status, 200);
    const [client] = JSON.parse(clients.text);
    assert.equal(client.publicClient, true);
    assert.equal(client.attributes['pkce.code.challenge.method'], 'S256');
    assert.equal(client.directAccessGrantsEnabled, false);
    const realmRes = await request('/auth/admin/realms/apexpredict', { headers });
    assert.equal(realmRes.status, 200);
    const realm = JSON.parse(realmRes.text);
    assert.equal(realm.registrationAllowed, true);
    assert.equal(realm.defaultLocale, 'es');
    const inherited = await request(`/auth/admin/realms/apexpredict/roles-by-id/${realm.defaultRole.id}/composites/realm`, { headers });
    assert.equal(inherited.status, 200);
    const defaults = JSON.parse(inherited.text).map(role => role.name);
    assert.ok(defaults.includes('player'), 'Nuevas cuentas tienen permisos de jugador');
    assert.ok(!defaults.includes('admin'), 'Registro sin privilegios de administrador');
  }],
];

let failed = 0;
for (const [name, check] of cases) {
  try { await check(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
}
console.log(`${cases.length - failed}/${cases.length} comprobaciones correctas (${fileURLToPath(import.meta.url)}).`);
process.exitCode = failed ? 1 : 0;
