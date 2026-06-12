/**
 * Pick the single most-specific nav href that matches the current pathname.
 * Prevents parent routes (e.g. /inventory) from staying active when a child
 * route (e.g. /inventory/builds) is open.
 */
export function resolveActiveNavHref(pathname: string, hrefs: string[]): string | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  const matches = hrefs.filter((href) => normalized === href || normalized.startsWith(`${href}/`));
  if (matches.length === 0) return null;

  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}

export function isNavItemActive(pathname: string, href: string, siblingHrefs: string[]): boolean {
  return resolveActiveNavHref(pathname, siblingHrefs) === href;
}
