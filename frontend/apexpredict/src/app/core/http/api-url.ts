export function secureApiTarget(requestUrl: string, apiUrl: string): string | null {
  const base = new URL(apiUrl, window.location.origin);
  const target = new URL(requestUrl, window.location.origin);
  if (
    target.origin !== base.origin ||
    !(target.pathname === base.pathname || target.pathname.startsWith(base.pathname + '/'))
  )
    return null;
  target.protocol = 'https:';
  return target.href;
}
