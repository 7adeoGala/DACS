const clientId = process.argv[2];
const clientSecret = process.argv[3];

if (!clientId || !clientSecret) {
  console.error('Uso: node scripts/set_google_oauth_credentials.js <GOOGLE_CLIENT_ID> <GOOGLE_CLIENT_SECRET>');
  process.exit(1);
}

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
  const headers = {
    'Authorization': 'Bearer ' + access_token,
    'Content-Type': 'application/json'
  };

  const idpPayload = {
    alias: 'google',
    displayName: 'Google',
    providerId: 'google',
    enabled: true,
    trustEmail: true,
    storeToken: false,
    addReadTokenRoleOnCreate: false,
    authenticateByDefault: false,
    linkOnly: false,
    firstBrokerLoginFlowAlias: 'first broker login auto link',
    config: {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      defaultScope: 'openid profile email'
    }
  };

  console.log('2. Guardando credenciales de Google Identity Provider en realm apexpredict...');
  const updateRes = await fetch('https://dacs-3-u0q1.onrender.com/auth/admin/realms/apexpredict/identity-provider/instances/google', {
    method: 'PUT',
    headers,
    body: JSON.stringify(idpPayload)
  });

  if (updateRes.status === 204 || updateRes.ok) {
    console.log('✓ ¡Google Identity Provider configurado exitosamente en Keycloak!');
    console.log('Callback URI configurada en Google Cloud Console:');
    console.log('  https://dacs-3-u0q1.onrender.com/auth/realms/apexpredict/broker/google/endpoint');
  } else {
    console.error('Error al actualizar IDP:', updateRes.status, await updateRes.text());
  }
}

main().catch(console.error);
