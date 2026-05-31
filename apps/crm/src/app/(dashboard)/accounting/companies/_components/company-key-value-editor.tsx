'use client';

import { useState } from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Entry = { key: string; value: string };

export function CompanyKeyValueEditor({ initialEntries = [] }: { initialEntries?: Entry[] }) {
  const [entries, setEntries] = useState<Entry[]>(
    initialEntries.length > 0 ? initialEntries : [{ key: '', value: '' }]
  );

  const updateEntry = (index: number, field: 'key' | 'value', value: string) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    );
  };

  const addEntry = () => {
    setEntries((prev) => [...prev, { key: '', value: '' }]);
  };

  const removeEntry = (index: number) => {
    setEntries((prev) =>
      prev.length <= 1 ? [{ key: '', value: '' }] : prev.filter((_, i) => i !== index)
    );
  };

  const serialized = JSON.stringify(entries.filter((entry) => entry.key.trim().length > 0));

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Cég adatok (kulcs–érték)</Label>
        <p className="text-muted-foreground text-xs">
          Egyedi mezők, pl. adószám, székhely, bankszámla.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {entries.map((entry, index) => (
          <div key={index} className="flex items-start gap-2">
            <Input
              placeholder="Kulcs"
              value={entry.key}
              onChange={(e) => updateEntry(index, 'key', e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Érték"
              value={entry.value}
              onChange={(e) => updateEntry(index, 'value', e.target.value)}
              className="flex-[2]"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive shrink-0"
              onClick={() => removeEntry(index)}
              aria-label="Sor törlése"
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addEntry}>
        <PlusIcon className="mr-1 h-4 w-4" />
        Új mező
      </Button>
      <input type="hidden" name="companyDataJson" value={serialized} />
    </div>
  );
}
