import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { request } from './local-http.mjs';

const users = JSON.parse(readFileSync(new URL('../.local/dev-users.json', import.meta.url), 'utf8'));
const redirectUri = 'https://dacs2026.local/apexpredict/';

async function login(username) {
  const verifier = randomBytes(32).toString('base64url');
  const state = randomBytes(16).toString('hex');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const query = new URLSearchParams({ client_id: 'apexpredict-web', response_type: 'code',
    response_mode: 'query', redirect_uri: redirectUri, scope: 'openid profile email',
    state, code_challenge: challenge, code_challenge_method: 'S256' });
  const form = await request(`/auth/realms/apexpredict/protocol/openid-connect/auth?${query}`);
  assert.equal(form.status, 200, 'Formulario de login');
  const action = form.text.match(/<form[^>]+action="([^"]+)"/);
  assert.ok(action, 'Formulario OIDC con action');
  const actionUrl = new URL(action[1].replaceAll('&amp;', '&'), 'https://dacs2026.local');
  assert.equal(actionUrl.origin, 'https://dacs2026.local');
  const cookies = (form.headers['set-cookie'] ?? []).map(cookie => cookie.split(';')[0]).join('; ');
  const signedIn = await request(actionUrl.href, { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies },
    body: new URLSearchParams({ username, password: users[username].password, credentialId: '' }).toString() });
  assert.equal(signedIn.status, 302, `Login de ${username}`);
  const callback = new URL(signedIn.headers.location);
  assert.equal(callback.origin + callback.pathname, redirectUri);
  assert.equal(callback.searchParams.get('state'), state);
  assert.ok(callback.searchParams.get('code'), 'Authorization code');
  const token = await request('/auth/realms/apexpredict/protocol/openid-connect/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: 'apexpredict-web',
      code: callback.searchParams.get('code'), redirect_uri: redirectUri, code_verifier: verifier }).toString(),
  });
  assert.equal(token.status, 200, 'Intercambio de codigo con PKCE');
  return token.json().access_token;
}

let player, admin, observer, league;
const tests = [
  ['BFF rechaza peticiones anonimas y tokens invalidos', async () => {
    assert.equal((await request('/api/leagues')).status, 401);
    assert.equal((await request('/api/leagues', { headers: { Authorization: 'Bearer forged-token' } })).status, 401);
  }],
  ['Login real de tres roles con Authorization Code y PKCE', async () => {
    player = await login('demo-player'); admin = await login('demo-admin'); observer = await login('demo-observer');
  }],
  ['JWT real accede al BFF y el perfil se persiste sin duplicados', async () => {
    const options = { method: 'PUT', headers: { Authorization: `Bearer ${player}`, 'Content-Type': 'application/json' }, body: '{}' };
    const first = await request('/api/me', options);
    const second = await request('/api/me', options);
    assert.equal(first.status, 200); assert.equal(second.status, 200);
    assert.ok(first.json().id); assert.equal(first.json().id, second.json().id);
  }],
  ['Una liga creada persiste y solo aparece para su miembro', async () => {
    const playerHeaders = { Authorization: `Bearer ${player}`, 'Content-Type': 'application/json' };
    const existing = await request('/api/leagues', { headers: playerHeaders });
    assert.equal(existing.status, 200);
    league = existing.json().find(item => item.name === 'Liga de verificacion DACS');
    if (!league) {
      const created = await request('/api/leagues', { method: 'POST', headers: playerHeaders,
        body: JSON.stringify({ name: 'Liga de verificacion DACS' }) });
      assert.equal(created.status, 201); league = created.json();
    }
    assert.ok((await request('/api/leagues', { headers: playerHeaders })).json().some(item => item.id === league.id));
    const other = await request('/api/leagues', { headers: { Authorization: `Bearer ${admin}` } });
    assert.equal(other.status, 200); assert.ok(!other.json().some(item => item.id === league.id));
  }],
  ['Roles: player no es admin y observer no es player', async () => {
    assert.equal((await request('/api/admin/status', { headers: { Authorization: `Bearer ${player}` } })).status, 403);
    assert.equal((await request('/api/admin/status', { headers: { Authorization: `Bearer ${admin}` } })).status, 200);
    assert.equal((await request('/api/me', { method: 'PUT', headers: { Authorization: `Bearer ${observer}` } })).status, 403);
  }],
  ['Entrada HTTPS de desarrollo y CORS limitado a origenes autorizados', async () => {
    const cors = await request('/api/me', { base: 'https://localhost:8080', method: 'OPTIONS',
      headers: { Origin: 'http://localhost:4200', 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'authorization,content-type' } });
    assert.equal(cors.status, 200); assert.equal(cors.headers['access-control-allow-origin'], 'http://localhost:4200');
    const badOrigin = await request('/api/me', { method: 'OPTIONS', headers: { Origin: 'https://attacker.invalid', 'Access-Control-Request-Method': 'PUT' } });
    assert.equal(badOrigin.status, 403);
    const localApi = await request('/api/leagues', { base: 'https://localhost:8080', headers: { Authorization: `Bearer ${player}` } });
    assert.equal(localApi.status, 200);
  }],
  ['Calendario y resultados reales de Jolpica a traves del BFF', async () => {
    const calendar = await request('/api/calendar/2026');
    assert.equal(calendar.status, 200); assert.ok(calendar.json().length > 0);
    assert.ok(calendar.json().every(race => race.season === 2026 && race.name && race.date));
    const results = await request('/api/results/2025/1');
    assert.equal(results.status, 200); assert.ok(results.json().some(result => result.position === 1));
  }],
];
let failures = 0;
for (const [name, test] of tests) {
  try { await test(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
console.log(`${tests.length - failures}/${tests.length} pruebas de integracion aprobadas.`);
process.exitCode = failures ? 1 : 0;
