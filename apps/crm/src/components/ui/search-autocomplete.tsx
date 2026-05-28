'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type SearchItem = {
  value: string;
  label: string;
  sublabel?: string;
  raw?: unknown;
};

export type SearchAutocompleteProps = {
  onSearch: (query: string) => Promise<SearchItem[]>;
  onSelect: (item: SearchItem) => void;
  placeholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  className?: string;
  disabled?: boolean;
  minChars?: number;
  debounceMs?: number;
};

export function SearchAutocomplete({
  onSearch,
  onSelect,
  placeholder = 'Keresés…',
  emptyMessage = 'Nincs találat',
  loadingMessage = 'Keresés…',
  className,
  disabled = false,
  minChars = 1,
  debounceMs = 300,
}: SearchAutocompleteProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const runSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < minChars) {
        setItems([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const results = await onSearch(q.trim());
        setItems(results);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        setItems([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [minChars, onSearch]
  );

  useEffect(() => {
    if (disabled) return;
    const timer = setTimeout(() => {
      void runSearch(query);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs, disabled, runSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectItem = (item: SearchItem) => {
    onSelect(item);
    setQuery('');
    setItems([]);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) selectItem(item);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-md"
        >
          {loading && <li className="text-muted-foreground px-3 py-2 text-sm">{loadingMessage}</li>}
          {!loading && items.length === 0 && (
            <li className="text-muted-foreground px-3 py-2 text-sm">{emptyMessage}</li>
          )}
          {!loading &&
            items.map((item, idx) => (
              <li key={item.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={idx === activeIndex}
                  className={cn(
                    'hover:bg-accent flex w-full flex-col items-start px-3 py-2 text-left text-sm',
                    idx === activeIndex && 'bg-accent'
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectItem(item);
                  }}
                >
                  <span className="font-medium">{item.label}</span>
                  {item.sublabel && (
                    <span className="text-muted-foreground text-xs">{item.sublabel}</span>
                  )}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
