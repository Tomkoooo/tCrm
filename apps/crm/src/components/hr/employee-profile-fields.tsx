import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export type CompanyOption = { _id: string; name: string };

export function EmployeeProfileFields({
  companies,
  defaultChecked = true,
  checkboxName = 'linkEmployee',
  checkboxLabel = 'Dolgozói profil (beosztás, szabadság)',
  showCheckbox = true,
  compact = false,
  initial,
}: {
  companies: CompanyOption[];
  defaultChecked?: boolean;
  checkboxName?: string;
  checkboxLabel?: string;
  showCheckbox?: boolean;
  /** Omit outer card chrome when embedded in user form section. */
  compact?: boolean;
  initial?: {
    companyId?: string;
    employeeNumber?: string;
    department?: string;
    phone?: string;
    hrNotes?: string;
  };
}) {
  return (
    <div
      className={
        compact ? 'flex flex-col gap-4' : 'border-border flex flex-col gap-4 rounded-lg border p-4'
      }
    >
      {!compact && (
        <div>
          <h3 className="font-medium">Dolgozói adatok</h3>
          <p className="text-muted-foreground text-sm">
            Cég és opcionális HR mezők — automatikusan összekötve a fiókkal (Saját beosztás).
          </p>
        </div>
      )}

      {showCheckbox && (
        <div className="flex items-center gap-2">
          <Checkbox
            id={checkboxName}
            name={checkboxName}
            defaultChecked={defaultChecked}
            value="true"
          />
          <Label htmlFor={checkboxName}>{checkboxLabel}</Label>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="companyId">Cég</Label>
          <select
            id="companyId"
            name="companyId"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            defaultValue={initial?.companyId ?? ''}
          >
            <option value="">Válasszon céget…</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="employeeNumber">Dolgozói szám</Label>
          <Input id="employeeNumber" name="employeeNumber" defaultValue={initial?.employeeNumber} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Osztály</Label>
          <Input id="department" name="department" defaultValue={initial?.department} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" defaultValue={initial?.phone} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="hrNotes">HR megjegyzés</Label>
          <Input id="hrNotes" name="hrNotes" defaultValue={initial?.hrNotes} />
        </div>
      </div>
    </div>
  );
}
