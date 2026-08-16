'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SupplierContactEntry } from '@crm/lib';
import { Button, Input, Label } from '@crm/ui';

const ROLE_PRESETS = [
  'Ügyvezető',
  'Értékesítés',
  'Technikai',
  'Mérnök',
  'Iroda',
  'Raktár',
  'Pénzügy / számlázás',
];

function emptyEntry(): SupplierContactEntry {
  return { role: '', name: '', phone: '', email: '' };
}

export function SupplierContactsEditor({
  name = 'contactsJson',
  initial = [],
}: {
  name?: string;
  initial?: SupplierContactEntry[];
}) {
  const [entries, setEntries] = useState<SupplierContactEntry[]>(initial.length > 0 ? initial : []);

  const update = (index: number, patch: Partial<SupplierContactEntry>) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const remove = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const add = (role = '') => {
    setEntries((prev) => [...prev, { ...emptyEntry(), role }]);
  };

  const serialized = entries
    .map((e) => ({
      role: e.role.trim(),
      name: e.name?.trim() || undefined,
      phone: e.phone?.trim() || undefined,
      email: e.email?.trim() || undefined,
    }))
    .filter((e) => e.role || e.name || e.phone || e.email);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm font-medium">Kapcsolattartók</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => add()}>
          <Plus className="mr-1 size-3.5" />
          Hozzáadás
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-sm">
          Még nincs kapcsolattartó. Adjon hozzá egyet, és nevezze el a szerepkört (pl. Értékesítés).
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry, index) => (
            <li key={index} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs font-medium">#{index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => remove(index)}
                  aria-label="Kapcsolattartó törlése"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <Label htmlFor={`contact-role-${index}`} className="text-xs">
                    Megnevezés / szerepkör
                  </Label>
                  <Input
                    id={`contact-role-${index}`}
                    placeholder="pl. Értékesítés"
                    value={entry.role}
                    onChange={(e) => update(index, { role: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`contact-name-${index}`} className="text-xs">
                    Név
                  </Label>
                  <Input
                    id={`contact-name-${index}`}
                    value={entry.name ?? ''}
                    onChange={(e) => update(index, { name: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`contact-phone-${index}`} className="text-xs">
                    Telefon
                  </Label>
                  <Input
                    id={`contact-phone-${index}`}
                    value={entry.phone ?? ''}
                    onChange={(e) => update(index, { phone: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <Label htmlFor={`contact-email-${index}`} className="text-xs">
                    E-mail
                  </Label>
                  <Input
                    id={`contact-email-${index}`}
                    type="email"
                    value={entry.email ?? ''}
                    onChange={(e) => update(index, { email: e.target.value })}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-1.5">
        {ROLE_PRESETS.map((role) => (
          <Button
            key={role}
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 text-xs"
            onClick={() => add(role)}
          >
            + {role}
          </Button>
        ))}
      </div>

      <input type="hidden" name={name} value={JSON.stringify(serialized)} />
    </div>
  );
}
