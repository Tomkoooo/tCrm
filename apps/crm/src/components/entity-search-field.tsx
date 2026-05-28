'use client';

import { useState } from 'react';
import { SearchAutocomplete, type SearchItem } from '@/components/ui/search-autocomplete';
import { Label } from '@/components/ui/label';

export function EntitySearchField({
  label,
  name,
  placeholder,
  defaultValue,
  defaultLabel,
  onSearch,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  defaultLabel?: string;
  onSearch: (query: string) => Promise<SearchItem[]>;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [display, setDisplay] = useState(defaultLabel ?? defaultValue ?? '');

  return (
    <div className="flex flex-col gap-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <input type="hidden" name={name} value={value} required={required} />
      <SearchAutocomplete
        placeholder={placeholder ?? 'Keresés…'}
        onSearch={onSearch}
        onSelect={(item) => {
          setValue(item.value);
          setDisplay(item.sublabel ? `${item.label} (${item.sublabel})` : item.label);
        }}
      />
      {display && (
        <p className="text-muted-foreground text-xs">
          Kiválasztva: <span className="text-foreground font-medium">{display}</span>
        </p>
      )}
    </div>
  );
}
