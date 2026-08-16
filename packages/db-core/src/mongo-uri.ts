/**
 * Normalizes MongoDB URIs for standalone/self-hosted servers.
 * The Node driver defaults to retryWrites=true, which requires a replica set.
 */
export function normalizeMongoUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return trimmed;

  if (/[?&]retryWrites=/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    url.searchParams.set('retryWrites', 'false');
    return url.toString();
  } catch {
    const separator = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${separator}retryWrites=false`;
  }
}
