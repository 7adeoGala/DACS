export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  renderWakeUrls: [] as string[],
  keycloak: {
    url: 'https://dacs2026.local/auth',
    realm: 'apexpredict',
    clientId: 'apexpredict-web',
  },
};
