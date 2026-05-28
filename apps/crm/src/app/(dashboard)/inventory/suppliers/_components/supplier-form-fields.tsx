import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type ContactValues = {
  ceoName?: string;
  ceoPhone?: string;
  ceoEmail?: string;
  salesName?: string;
  salesPhone?: string;
  salesEmail?: string;
  technicalName?: string;
  technicalPhone?: string;
  technicalEmail?: string;
  warehouseName?: string;
  warehousePhone?: string;
  warehouseEmail?: string;
  financeName?: string;
  financePhone?: string;
  financeEmail?: string;
};

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
  contacts?: ContactValues;
};

function ContactBlock({
  title,
  prefix,
  defaults,
}: {
  title: string;
  prefix: string;
  defaults?: ContactValues;
}) {
  return (
    <fieldset className="grid gap-3 rounded-md border p-3 md:grid-cols-3">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${prefix}Name`}>Név</Label>
        <Input
          id={`${prefix}Name`}
          name={`${prefix}Name`}
          defaultValue={defaults?.[`${prefix}Name` as keyof ContactValues] as string}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${prefix}Phone`}>Telefon</Label>
        <Input
          id={`${prefix}Phone`}
          name={`${prefix}Phone`}
          defaultValue={defaults?.[`${prefix}Phone` as keyof ContactValues] as string}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${prefix}Email`}>E-mail</Label>
        <Input
          id={`${prefix}Email`}
          name={`${prefix}Email`}
          type="email"
          defaultValue={defaults?.[`${prefix}Email` as keyof ContactValues] as string}
        />
      </div>
    </fieldset>
  );
}

export function SupplierFormFields({
  supplier,
  keyReadOnly = false,
}: {
  supplier?: SupplierValues;
  keyReadOnly?: boolean;
}) {
  const c = supplier?.contacts;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="key">Kulcs (slug) — import: crm_supplier_slug</Label>
          <Input
            id="key"
            name="key"
            required
            readOnly={keyReadOnly}
            placeholder="pl. steinigke"
            defaultValue={supplier?.key}
          />
          <p className="text-muted-foreground text-xs">
            Egyedi azonosító. Ugyanez szerepel az Excel import oszlopában.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Cégnév</Label>
          <Input id="name" name="name" required defaultValue={supplier?.name} />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="address">Cím</Label>
          <Input id="address" name="address" defaultValue={supplier?.address} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">Város</Label>
          <Input id="city" name="city" defaultValue={supplier?.city} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="postalCode">Irányítószám</Label>
          <Input id="postalCode" name="postalCode" defaultValue={supplier?.postalCode} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="country">Ország</Label>
          <Input id="country" name="country" defaultValue={supplier?.country} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Központi telefon</Label>
          <Input id="phone" name="phone" defaultValue={supplier?.phone} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Központi e-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={supplier?.email} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="taxNo">Adószám</Label>
          <Input id="taxNo" name="taxNo" defaultValue={supplier?.taxNo} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="euTaxNo">EU adószám</Label>
          <Input id="euTaxNo" name="euTaxNo" defaultValue={supplier?.euTaxNo} />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="registry">Cégjegyzék / WEEE / egyéb</Label>
          <textarea
            id="registry"
            name="registry"
            rows={2}
            placeholder="pl. Würzburg HR B 4703, WEEE-Nr.: …"
            defaultValue={supplier?.registry}
            className={cn(
              'border-input bg-background ring-offset-background shadow-xs flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2'
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Kapcsolattartók (mint a beszállító Excel sablon)</p>
        <ContactBlock title="Ügyvezető" prefix="ceo" defaults={c} />
        <ContactBlock title="Értékesítés" prefix="sales" defaults={c} />
        <ContactBlock title="Technikai" prefix="technical" defaults={c} />
        <ContactBlock title="Raktár" prefix="warehouse" defaults={c} />
        <ContactBlock title="Pénzügy / számlázás" prefix="finance" defaults={c} />
      </div>
    </div>
  );
}
