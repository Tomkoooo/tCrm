'use client';

import type { SupplierContactEntry } from '@crm/lib';

import { cn } from '@/lib/utils';
import { SupplierContactsEditor } from './supplier-contacts-editor';
import { Input, Label } from '@crm/ui';

type SupplierValues = {
  key?: string;
  name?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  taxNo?: string;
  euTaxNo?: string;
  registry?: string;
  contacts?: SupplierContactEntry[];
};

export function SupplierFormFields({
  supplier,
  keyReadOnly = false,
  compact = false,
}: {
  supplier?: SupplierValues;
  keyReadOnly?: boolean;
  /** Tighter layout for EntitySheet */
  compact?: boolean;
}) {
  const gap = compact ? 'gap-4' : 'gap-6';

  return (
    <div className={cn('flex flex-col', gap)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="key">Kulcs (slug) — import: crm_supplier_slug</Label>
          <Input
            id="key"
            name="key"
            required
            readOnly={keyReadOnly}
            placeholder="pl. steinigke"
            defaultValue={supplier?.key}
            className="font-mono text-sm"
          />
          {!compact && (
            <p className="text-muted-foreground text-xs">
              Egyedi azonosító. Ugyanez szerepel az Excel import oszlopában.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="name">Cégnév</Label>
          <Input id="name" name="name" required defaultValue={supplier?.name} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="address">Cím</Label>
          <Input id="address" name="address" defaultValue={supplier?.address} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Város</Label>
          <Input id="city" name="city" defaultValue={supplier?.city} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="postalCode">Irányítószám</Label>
          <Input id="postalCode" name="postalCode" defaultValue={supplier?.postalCode} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Ország</Label>
          <Input id="country" name="country" defaultValue={supplier?.country} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Központi telefon</Label>
          <Input id="phone" name="phone" defaultValue={supplier?.phone} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Központi e-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={supplier?.email} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="taxNo">Adószám</Label>
          <Input id="taxNo" name="taxNo" defaultValue={supplier?.taxNo} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="euTaxNo">EU adószám</Label>
          <Input id="euTaxNo" name="euTaxNo" defaultValue={supplier?.euTaxNo} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="registry">Cégjegyzék / WEEE / egyéb</Label>
          <textarea
            id="registry"
            name="registry"
            rows={compact ? 2 : 3}
            placeholder="pl. Würzburg HR B 4703, WEEE-Nr.: …"
            defaultValue={supplier?.registry}
            className={cn(
              'border-input bg-background ring-offset-background shadow-xs flex w-full rounded-md border px-3 py-2 text-sm',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2'
            )}
          />
        </div>
      </div>

      <SupplierContactsEditor initial={supplier?.contacts ?? []} />
    </div>
  );
}
