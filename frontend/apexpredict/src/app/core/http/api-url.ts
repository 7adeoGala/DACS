/** Comparacion por origen y frontera de ruta: evita filtrar JWT a URLs parecidas. */
export function secureApiTarget(requestUrl: string, apiUrl: string): string | null {
  const base = new URL(apiUrl);
  const target = new URL(requestUrl, window.location.origin);
  if (
    target.origin !== base.origin ||
    !(target.pathname === base.pathname || target.pathname.startsWith(base.pathname + '/'))
  )
    return null;
  target.protocol = 'https:';
  return target.href;
}
