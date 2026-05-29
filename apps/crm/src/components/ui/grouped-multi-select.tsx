'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { XIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type GroupedSelectOption = {
  value: string;
  label: string;
  sublabel?: string;
};

export type GroupedSelectGroup = {
  roleKey: string;
  roleName: string;
  options: GroupedSelectOption[];
};

export type GroupedMultiSelectProps = {
  groups: GroupedSelectGroup[];
  selected: string[];
  onChange: (selected: string[]) => void;
  onSearch: (query: string) => void | Promise<void>;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  /** Resolve label for chips when option not in current groups */
  resolveLabel?: (value: string) => string | undefined;
};

export function GroupedMultiSelect({
  groups,
  selected,
  onChange,
  onSearch,
  placeholder = 'Keresés név vagy e-mail alapján…',
  emptyMessage = 'Nincs találat',
  disabled = false,
  className,
  resolveLabel,
}: GroupedMultiSelectProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const optionMap = useMemo(() => {
    const map = new Map<string, GroupedSelectOption>();
    for (const g of groups) {
      for (const o of g.options) {
        map.set(o.value, o);
      }
    }
    return map;
  }, [groups]);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((id) => id !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const remove = (value: string) => {
    onChange(selected.filter((id) => id !== value));
  };

  const runSearch = useCallback(
    (q: string) => {
      void onSearch(q);
      if (q.trim().length > 0) setOpen(true);
    },
    [onSearch]
  );

  useEffect(() => {
    if (disabled) return;
    const timer = setTimeout(() => runSearch(query), 280);
    return () => clearTimeout(timer);
  }, [query, disabled, runSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const flatCount = groups.reduce((n, g) => n + g.options.length, 0);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div ref={containerRef} className="relative">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            void onSearch(query);
            setOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
        />
        {open && (
          <div
            id={listId}
            role="listbox"
            className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border shadow-md"
          >
            {flatCount === 0 && (
              <p className="text-muted-foreground px-3 py-2 text-sm">{emptyMessage}</p>
            )}
            {groups.map((group) => (
              <div key={group.roleKey}>
                <div className="bg-muted/60 text-muted-foreground sticky top-0 px-3 py-1.5 text-xs font-medium">
                  {group.roleName}
                </div>
                <ul>
                  {group.options.map((opt) => {
                    const isSelected = selected.includes(opt.value);
                    return (
                      <li key={`${group.roleKey}-${opt.value}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={cn(
                            'hover:bg-accent flex w-full items-start gap-2 px-3 py-2 text-left text-sm',
                            isSelected && 'bg-accent/80'
                          )}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            toggle(opt.value);
                          }}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border text-[10px]',
                              isSelected && 'bg-primary border-primary text-primary-foreground'
                            )}
                          >
                            {isSelected ? '✓' : ''}
                          </span>
                          <span className="min-w-0">
                            <span className="font-medium">{opt.label}</span>
                            {opt.sublabel && (
                              <span className="text-muted-foreground block text-xs">
                                {opt.sublabel}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const opt = optionMap.get(id);
            const label = opt?.label ?? resolveLabel?.(id) ?? id;
            return (
              <span
                key={id}
                className="bg-secondary inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-xs"
              >
                <span className="truncate">{label}</span>
                {!disabled && (
                  <button
                    type="button"
                    className="hover:bg-muted rounded p-0.5"
                    aria-label={`Eltávolítás: ${label}`}
                    onClick={() => remove(id)}
                  >
                    <XIcon className="size-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
      <p className="text-muted-foreground text-xs">{selected.length} kiválasztva</p>
    </div>
  );
}
