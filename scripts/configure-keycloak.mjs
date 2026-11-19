import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { adminApi } from './local-http.mjs';
import { loginWithCode } from './local-oidc.mjs';

const api = await adminApi();
const realm = JSON.parse(readFileSync(new URL('../infra/keycloak/apexpredict-realm.json', import.meta.url), 'utf8'));
const settings = ['registrationAllowed', 'loginWithEmailAllowed', 'duplicateEmailsAllowed',
  'verifyEmail', 'resetPasswordAllowed', 'internationalizationEnabled', 'supportedLocales',
  'defaultLocale', 'passwordPolicy'];
const currentRealm = (await api('')).json();
const defaultRole = currentRealm.defaultRole;
if (!defaultRole?.id) throw new Error('Keycloak no informa el rol predeterminado del realm.');
const playerRole = (await api('/roles/player')).json();
const inheritedRoles = (await api(`/roles-by-id/${defaultRole.id}/composites/realm`)).json();
if (inheritedRoles.some(role => role.name === 'admin')) {
  throw new Error('El rol predeterminado incluye admin. Revisar la configuracion antes de habilitar cuentas.');
}
if (!inheritedRoles.some(role => role.name === 'player')) {
  await api(`/roles-by-id/${defaultRole.id}/composites`, 'POST', [playerRole]);
}
await api('', 'PUT', Object.fromEntries(settings.map(key => [key, realm[key]])));
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
console.log('Registro habilitado en espanol. Las cuentas nuevas reciben el rol player.');

if (process.argv.includes('--demo')) {

  const profile = (await api('/users/profile')).json();
  const marker = { name: 'apexpredict-dev', displayName: 'Cuenta de pruebas ApexPredict',
    permissions: { view: ['admin'], edit: ['admin'] }, multivalued: false };
  profile.attributes = [...profile.attributes.filter(attribute => attribute.name !== marker.name), marker];
  await api('/users/profile', 'PUT', profile);
  const localDir = new URL('../.local/', import.meta.url);
  const credentialsFile = new URL('dev-users.json', localDir);
  mkdirSync(localDir, { recursive: true });
  const credentials = existsSync(credentialsFile) ? JSON.parse(readFileSync(credentialsFile, 'utf8')) : {};
  const roles = (await api('/roles')).json();
  for (const [username, assigned] of [['demo-player', ['player']], ['demo-admin', ['player', 'admin']], ['demo-observer', []]]) {
    let [user] = (await api(`/users?username=${username}&exact=true`)).json();
    if (user && !credentials[username]?.password) {
      throw new Error(`La cuenta ${username} ya existe y no pertenece a este setup. No se modifica.`);
    }
    if (user && user.attributes?.['apexpredict-dev']?.[0] !== 'true') {

      const token = await loginWithCode(username, credentials[username].password);
      const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      if (claims.sub !== user.id) throw new Error(`La credencial local no corresponde a ${username}.`);
      const details = (await api(`/users/${user.id}`)).json();
      await api(`/users/${user.id}`, 'PUT', {
        ...details, attributes: { ...details.attributes, 'apexpredict-dev': ['true'] },
      });
      console.log(`Cuenta demo anterior reconocida mediante login: ${username}.`);
    }
    if (!user) {
      const password = credentials[username]?.password ?? randomBytes(24).toString('base64url');
      credentials[username] = { username, password, roles: assigned };
      writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2), { mode: 0o600 });
      await api('/users', 'POST', { username, enabled: true, emailVerified: true,
        email: `${username}@example.com`, firstName: 'Demo', lastName: username.replace('demo-', ''),
        attributes: { 'apexpredict-dev': ['true'] }, requiredActions: [],
        credentials: [{ type: 'password', value: password, temporary: false }] });
      [user] = (await api(`/users?username=${username}&exact=true`)).json();
    }
    const details = (await api(`/users/${user.id}`)).json();
    if (!details.email || !details.firstName || !details.lastName) {
      await api(`/users/${user.id}`, 'PUT', { ...details,
        email: details.email || `${username}@example.com`,
        firstName: details.firstName || 'Demo', lastName: details.lastName || username.replace('demo-', ''),
      });
    }
    if (assigned.length) await api(`/users/${user.id}/role-mappings/realm`, 'POST',
      roles.filter(role => assigned.includes(role.name)));
    if (username === 'demo-observer') {
      const mappings = (await api(`/users/${user.id}/role-mappings/realm`)).json();
      const removed = mappings.filter(role => [defaultRole.name, 'player', 'admin'].includes(role.name));
      if (removed.length) await api(`/users/${user.id}/role-mappings/realm`, 'DELETE', removed);
    }
  }
  console.log('Cuentas locales de prueba listas. Credenciales en .local/dev-users.json (excluido de Git).');
}
