export const environment = {
  production: false,
  // Valor de la consigna: el interceptor cambia a HTTPS antes de enviar datos.
  apiUrl: 'http://localhost:8080/api',
  keycloak: {
    url: 'https://dacs2026.local/auth',
    realm: 'apexpredict',
    clientId: 'apexpredict-web',
  },
  supabase: {
    url: 'https://xffnnfwivgeemzsqgtgn.supabase.co',
    publishableKey: 'sb_publishable_5GsmuCXkFK4Qo_OJ7fwUdA_UlFzDhJ6',
  },
};
