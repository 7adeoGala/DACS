import { environment as development } from './environment.development';

export const environment = {
  ...development,
  production: true,
  apiUrl: 'https://dacs2026.local/api',
};
