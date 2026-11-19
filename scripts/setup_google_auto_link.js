/**
 * Script para configurar el flujo de auto-vinculación de Google en Keycloak (Realm apexpredict)
 * Permite que usuarios con cuentas ya creadas (con el mismo email) puedan iniciar sesión
 * con Google directamente sin ser bloqueados ni requerir verificación manual de linking.
 * 
 * Uso:
 *   node scripts/setup_google_auto_link.js
 */

async function main() {
  console.log('1. Autenticando con Keycloak Master Admin...');
  const tokenRes = await fetch('https://dacs-3-u0q1.onrender.com/auth/realms/master/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: 'admin-cli',
      username: 'admin',
      password: 'Vasquito5',
      grant_type: 'password'
    }).toString()
  });

  if (!tokenRes.ok) {
    console.error('Error al obtener token admin:', tokenRes.status, await tokenRes.text());
    process.exit(1);
  }

  const { access_token } = await tokenRes.json();
  const headers = { Authorization: 'Bearer ' + access_token, 'Content-Type': 'application/json' };

  // 1. Verificar si existe el flujo personalizado
  const flowsRes = await fetch('https://dacs-3-u0q1.onrender.com/auth/admin/realms/apexpredict/authentication/flows', { headers });
  const flows = await flowsRes.json();
  let customFlow = flows.find(f => f.alias === 'first broker login auto link');

  if (!customFlow) {
    console.log('2. Copiando flujo base "first broker login" a "first broker login auto link"...');
    const copyRes = await fetch('https://dacs-3-u0q1.onrender.com/auth/admin/realms/apexpredict/authentication/flows/first%20broker%20login/copy', {
      method: 'POST',
      headers,
      body: JSON.stringify({ newName: 'first broker login auto link' })
    });
    console.log('Copia de flujo:', copyRes.status);
  } else {
    console.log('2. Flujo "first broker login auto link" ya existe.');
  }

  // 2. Obtener ejecuciones del flujo copiado
  const execsRes = await fetch('https://dacs-3-u0q1.onrender.com/auth/admin/realms/apexpredict/authentication/flows/first%20broker%20login%20auto%20link/executions', { headers });
  const execs = await execsRes.json();

  // 3. Desactivar "Review Profile" para evitar pantallas intermedias
  const reviewExec = execs.find(e => e.providerId === 'idp-review-profile');
  if (reviewExec && reviewExec.requirement !== 'DISABLED') {
    reviewExec.requirement = 'DISABLED';
    await fetch('https://dacs-3-u0q1.onrender.com/auth/admin/realms/apexpredict/authentication/flows/first%20broker%20login%20auto%20link/executions', {
      method: 'PUT',
      headers,
      body: JSON.stringify(reviewExec)
    });
    console.log('✓ "Review Profile" desactivado.');
  }

  // 4. Asegurar que idp-auto-link esté presente en el subflujo "User creation or linking"
  const userCreationFlow = execs.find(e => e.displayName && e.displayName.includes('User creation or linking'));
  let autoLinkExec = execs.find(e => e.providerId === 'idp-auto-link');

  if (!autoLinkExec && userCreationFlow) {
    console.log('3. Agregando idp-auto-link al subflujo "User creation or linking"...');
    await fetch('https://dacs-3-u0q1.onrender.com/auth/admin/realms/apexpredict/authentication/flows/' + encodeURIComponent(userCreationFlow.displayName) + '/executions/execution', {
      method: 'POST',
      headers,
      body: JSON.stringify({ provider: 'idp-auto-link' })
    });
    // Volver a consultar para obtener su ID
    const refetch = await fetch('https://dacs-3-u0q1.onrender.com/auth/admin/realms/apexpredict/authentication/flows/first%20broker%20login%20auto%20link/executions', { headers });
    const newExecs = await refetch.json();
    autoLinkExec = newExecs.find(e => e.providerId === 'idp-auto-link');
  }

  if (autoLinkExec && autoLinkExec.requirement !== 'ALTERNATIVE') {
    autoLinkExec.requirement = 'ALTERNATIVE';
    await fetch('https://dacs-3-u0q1.onrender.com/auth/admin/realms/apexpredict/authentication/flows/first%20broker%20login%20auto%20link/executions', {
      method: 'PUT',
      headers,
      body: JSON.stringify(autoLinkExec)
    });
    console.log('✓ "idp-auto-link" configurado como ALTERNATIVE.');
  }

  // 5. Desactivar "Handle Existing Account" para que use auto-link directo
  const handleExistingExec = execs.find(e => e.displayName && e.displayName.includes('Handle Existing Account'));
  if (handleExistingExec && handleExistingExec.requirement !== 'DISABLED') {
    handleExistingExec.requirement = 'DISABLED';
    await fetch('https://dacs-3-u0q1.onrender.com/auth/admin/realms/apexpredict/authentication/flows/first%20broker%20login%20auto%20link/executions', {
      method: 'PUT',
      headers,
      body: JSON.stringify(handleExistingExec)
    });
    console.log('✓ "Handle Existing Account" desactivado.');
  }

  // 6. Configurar el proveedor Google para usar el nuevo flujo
  const idpRes = await fetch('https://dacs-3-u0q1.onrender.com/auth/admin/realms/apexpredict/identity-provider/instances/google', { headers });
  if (idpRes.ok) {
    const idp = await idpRes.json();
    idp.firstBrokerLoginFlowAlias = 'first broker login auto link';
    idp.trustEmail = true;
    idp.linkOnly = false;
    await fetch('https://dacs-3-u0q1.onrender.com/auth/admin/realms/apexpredict/identity-provider/instances/google', {
      method: 'PUT',
      headers,
      body: JSON.stringify(idp)
    });
    console.log('✓ Google Identity Provider vinculado al flujo "first broker login auto link".');
  }

  console.log('\n¡Configuración completada con éxito! Ahora los usuarios ya registrados pueden iniciar sesión con Google de inmediato.');
}

main().catch(console.error);
