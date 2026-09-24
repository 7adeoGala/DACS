import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { adminApi } from './local-http.mjs';

const api = await adminApi();
const realm = JSON.parse(readFileSync(new URL('../infra/keycloak/apexpredict-realm.json', import.meta.url), 'utf8'));
const desired = realm.clients.find(client => client.clientId === 'apexpredict-web');
const [current] = (await api('/clients?clientId=apexpredict-web')).json();
if (!current) throw new Error('El realm debe importarse al iniciar Keycloak antes de configurar el cliente.');
const { protocolMappers, ...clientConfig } = desired;
await api(`/clients/${current.id}`, 'PUT', { ...current, ...clientConfig });
const existingMappers = (await api(`/clients/${current.id}/protocol-mappers/models`)).json();
for (const mapper of protocolMappers) {
  const existing = existingMappers.find(item => item.name === mapper.name);
  await api(`/clients/${current.id}/protocol-mappers/models${existing ? '/' + existing.id : ''}`,
    existing ? 'PUT' : 'POST', { ...mapper, ...(existing ? { id: existing.id } : {}) });
}
console.log('Cliente Keycloak actualizado: callbacks de desarrollo, PKCE y audiencia del BFF.');

if (process.argv.includes('--demo')) {
  const localDir = new URL('../.local/', import.meta.url);
  const credentialsFile = new URL('dev-users.json', localDir);
  mkdirSync(localDir, { recursive: true });
  const credentials = existsSync(credentialsFile) ? JSON.parse(readFileSync(credentialsFile, 'utf8')) : {};
  const roles = (await api('/roles')).json();
  for (const [username, assigned] of [['demo-player', ['player']], ['demo-admin', ['player', 'admin']], ['demo-observer', []]]) {
    let [user] = (await api(`/users?username=${username}&exact=true`)).json();
    if (user && (!credentials[username] || user.attributes?.['apexpredict-dev']?.[0] !== 'true')) {
      throw new Error(`La cuenta ${username} ya existe y no pertenece a este setup. No se modifica.`);
    }
    if (!user) {
      const password = credentials[username]?.password ?? randomBytes(24).toString('base64url');
      // Guardar antes de provisionar permite retomar si se interrumpe el script.
      credentials[username] = { username, password, roles: assigned };
      writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2), { mode: 0o600 });
      await api('/users', 'POST', { username, enabled: true, emailVerified: true,
        email: `${username}@example.com`, firstName: 'Demo', lastName: username.replace('demo-', ''),
        attributes: { 'apexpredict-dev': ['true'] }, requiredActions: [],
        credentials: [{ type: 'password', value: password, temporary: false }] });
      [user] = (await api(`/users?username=${username}&exact=true`)).json();
    }
    if (assigned.length) await api(`/users/${user.id}/role-mappings/realm`, 'POST',
      roles.filter(role => assigned.includes(role.name)));
  }
  console.log('Cuentas locales de prueba listas. Credenciales en .local/dev-users.json (excluido de Git).');
}
