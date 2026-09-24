import { readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';

export const ca = readFileSync(new URL('../infra/certs/generated/dacs2026.local.pem', import.meta.url));
export const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(line => /^[A-Z][A-Z0-9_]*=/.test(line))
  .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));

export function request(path, { method = 'GET', headers = {}, body, base = 'https://dacs2026.local', timeout = 20000 } = {}) {
  const url = new URL(path, base);
  if (!['dacs2026.local', 'localhost'].includes(url.hostname)) throw new Error('Solo destinos de desarrollo locales.');
  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).request(url, {
      ca, rejectUnauthorized: true, method, headers, timeout,
    }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; });
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text,
        json: () => JSON.parse(text) }));
    });
    req.on('timeout', () => req.destroy(new Error(`Timeout: ${url.pathname}`)));
    req.on('error', reject);
    req.end(body);
  });
}

export async function adminApi() {
  const result = await request('/auth/realms/master/protocol/openid-connect/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: 'admin-cli', grant_type: 'password',
      username: env.KEYCLOAK_ADMIN, password: env.KEYCLOAK_ADMIN_PASSWORD }).toString(),
  });
  if (result.status !== 200) throw new Error(`Keycloak admin: HTTP ${result.status}`);
  const token = result.json().access_token;
  return async (path, method = 'GET', data) => {
    const response = await request(`/auth/admin/realms/apexpredict${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    if (response.status >= 400) throw new Error(`Keycloak ${method} ${path}: HTTP ${response.status}`);
    return response;
  };
}
