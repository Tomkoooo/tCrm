/** Normalize person/company names for fuzzy equality checks (accent-insensitive). */
export function normalizeHrMatchName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hrNamesMatch(a: string, b: string): boolean {
  const na = normalizeHrMatchName(a);
  const nb = normalizeHrMatchName(b);
  if (!na || !nb) return false;
  return na === nb;
}

export function findBestNameMatch<T extends { name: string }>(
  needle: string,
  candidates: T[]
): T | undefined {
  const normalized = normalizeHrMatchName(needle);
  if (!normalized) return undefined;
  const exact = candidates.filter((c) => normalizeHrMatchName(c.name) === normalized);
  if (exact.length === 1) return exact[0];
  return undefined;
}
