import { environment as development } from './environment.development';

// Build optimizado para Nginx local, independiente del despliegue de Vercel.
export const environment = {
  ...development,
  production: true,
  apiUrl: 'https://dacs2026.local/api',
};
