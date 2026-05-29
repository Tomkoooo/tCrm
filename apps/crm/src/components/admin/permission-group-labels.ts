/** Hungarian labels for permission `group` keys from seed. */
export const PERMISSION_GROUP_LABELS: Record<string, string> = {
  admin: 'Adminisztráció',
  users: 'Felhasználók',
  inventory: 'Készletkezelés',
  offers: 'Értékesítés',
  logistics: 'Logisztika',
  media: 'Médiatár',
  secrets: 'Titoktár',
  accounting: 'Könyvelés',
  hr: 'HR',
};

export function permissionGroupLabel(group: string): string {
  return PERMISSION_GROUP_LABELS[group] ?? group;
}

export function sortPermissionGroups(groups: string[]): string[] {
  const order = Object.keys(PERMISSION_GROUP_LABELS);
  return [...groups].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}
