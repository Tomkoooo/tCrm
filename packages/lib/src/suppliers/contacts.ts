export type SupplierContactEntry = {
  role: string;
  name?: string;
  phone?: string;
  email?: string;
};

const LEGACY_ROLES: Array<{ prefix: string; role: string }> = [
  { prefix: 'ceo', role: 'Ügyvezető' },
  { prefix: 'sales', role: 'Értékesítés' },
  { prefix: 'technical', role: 'Technikai' },
  { prefix: 'engineer', role: 'Mérnök' },
  { prefix: 'office', role: 'Iroda' },
  { prefix: 'warehouse', role: 'Raktár' },
  { prefix: 'finance', role: 'Pénzügy / számlázás' },
];

function trimOrUndefined(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

/** Flat legacy `contacts` object → array for forms and display. */
export function normalizeSupplierContacts(contacts: unknown): SupplierContactEntry[] {
  if (!contacts) return [];
  if (Array.isArray(contacts)) {
    return contacts
      .map((c) => ({
        role: trimOrUndefined(c?.role) ?? '',
        name: trimOrUndefined(c?.name),
        phone: trimOrUndefined(c?.phone),
        email: trimOrUndefined(c?.email),
      }))
      .filter((c) => c.role || c.name || c.phone || c.email);
  }
  if (typeof contacts !== 'object') return [];

  const flat = contacts as Record<string, unknown>;
  const out: SupplierContactEntry[] = [];
  for (const { prefix, role } of LEGACY_ROLES) {
    const name = trimOrUndefined(flat[`${prefix}Name`]);
    const phone = trimOrUndefined(flat[`${prefix}Phone`]);
    const email = trimOrUndefined(flat[`${prefix}Email`]);
    if (name || phone || email) {
      out.push({ role, name, phone, email });
    }
  }
  return out;
}

/** Prefer sales-like role; supports legacy flat storage. */
export function primarySalesContactName(contacts: unknown): string | undefined {
  const list = normalizeSupplierContacts(contacts);
  const sales = list.find((c) => /értékesít|sales/i.test(c.role));
  return sales?.name ?? list.find((c) => c.name)?.name;
}

export function contactsHaveData(entries: SupplierContactEntry[]): boolean {
  return entries.some((c) => c.role || c.name || c.phone || c.email);
}
