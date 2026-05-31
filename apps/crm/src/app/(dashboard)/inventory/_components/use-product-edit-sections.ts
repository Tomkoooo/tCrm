'use client';

import { useCallback, useEffect, useState } from 'react';

export type ProductEditSectionId =
  | 'identifiers'
  | 'names'
  | 'dimensions'
  | 'pricing'
  | 'misc'
  | 'stock'
  | 'bom'
  | 'guide'
  | 'images'
  | 'guideFiles';

const STORAGE_KEY = 'tcrm.inventory.productEditSections';

export const PRODUCT_EDIT_SECTION_DEFAULTS: Record<ProductEditSectionId, boolean> = {
  identifiers: true,
  names: false,
  dimensions: false,
  pricing: false,
  misc: false,
  stock: true,
  bom: false,
  guide: false,
  images: false,
  guideFiles: false,
};

function readStoredSections(): Record<ProductEditSectionId, boolean> {
  if (typeof window === 'undefined') return { ...PRODUCT_EDIT_SECTION_DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...PRODUCT_EDIT_SECTION_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Record<ProductEditSectionId, boolean>>;
    return { ...PRODUCT_EDIT_SECTION_DEFAULTS, ...parsed };
  } catch {
    return { ...PRODUCT_EDIT_SECTION_DEFAULTS };
  }
}

export function useProductEditSections() {
  const [sections, setSections] = useState<Record<ProductEditSectionId, boolean>>(
    PRODUCT_EDIT_SECTION_DEFAULTS
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSections(readStoredSections());
    setReady(true);
  }, []);

  const setOpen = useCallback((id: ProductEditSectionId, open: boolean) => {
    setSections((prev) => {
      const next = { ...prev, [id]: open };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }, []);

  return { sections, setOpen, ready };
}
