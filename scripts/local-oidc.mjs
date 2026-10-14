import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { request } from './local-http.mjs';

// Login local con el mismo flujo publico que Angular; no habilita password grant.
export async function loginWithCode(username, password) {
  const redirectUri = 'https://dacs2026.local/apexpredict/';
  const verifier = randomBytes(32).toString('base64url');
  const state = randomBytes(16).toString('hex');
  const query = new URLSearchParams({ client_id: 'apexpredict-web', response_type: 'code',
    response_mode: 'query', redirect_uri: redirectUri, scope: 'openid profile email', state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
  const form = await request(`/auth/realms/apexpredict/protocol/openid-connect/auth?${query}`);
  assert.equal(form.status, 200, 'Formulario de login');
  const action = form.text.match(/<form[^>]+action="([^"]+)"/);
  assert.ok(action, 'Formulario OIDC con action');
  const actionUrl = new URL(action[1].replaceAll('&amp;', '&'), 'https://dacs2026.local');
  assert.equal(actionUrl.origin, 'https://dacs2026.local');
  const cookies = (form.headers['set-cookie'] ?? []).map(cookie => cookie.split(';')[0]).join('; ');
  const signedIn = await request(actionUrl.href, { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies },
    body: new URLSearchParams({ username, password, credentialId: '' }).toString() });
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
