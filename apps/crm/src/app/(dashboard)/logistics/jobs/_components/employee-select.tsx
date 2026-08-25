'use client';

import { Button, SearchAutocomplete, type SearchItem } from '@crm/ui';
import { searchEmployeesAction } from '@/lib/employee-search';

/** Single-employee picker (pickup/drop-off responsible). */
export function EmployeeSelect({
  selectedLabel,
  onSelect,
  onClear,
  placeholder,
  disabled,
}: {
  selectedLabel?: string;
  onSelect: (item: SearchItem) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <SearchAutocomplete
        placeholder={placeholder ?? 'Keresés név vagy e-mail…'}
        onSearch={searchEmployeesAction}
        selectedLabel={selectedLabel}
        onSelect={onSelect}
        disabled={disabled}
      />
      {onClear && selectedLabel ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Törlés
        </Button>
      ) : null}
    </div>
  );
}
