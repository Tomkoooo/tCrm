'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Input } from '@crm/ui';
import { setWarehouseStockAction } from '../../quick-actions';

export function CountQtyCell({
  productId,
  warehouseId,
  initialOnHand,
}: {
  productId: string;
  warehouseId: string;
  initialOnHand: number;
}) {
  const [value, setValue] = useState(String(initialOnHand));
  const savedRef = useRef(initialOnHand);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(String(initialOnHand));
    savedRef.current = initialOnHand;
  }, [initialOnHand]);

  const commit = () => {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 0) {
      setValue(String(savedRef.current));
      toast.error('A készlet nem lehet negatív.');
      return;
    }
    const qty = Math.floor(next);
    if (qty === savedRef.current) {
      setValue(String(qty));
      return;
    }

    startTransition(async () => {
      const result = await setWarehouseStockAction(productId, warehouseId, qty);
      if (!result.success) {
        setValue(String(savedRef.current));
        toast.error(result.message);
        return;
      }
      savedRef.current = result.onHand;
      setValue(String(result.onHand));
    });
  };

  return (
    <div
      className="flex justify-end"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        className="h-8 w-24 text-right"
        value={value}
        disabled={pending}
        aria-label="Számolt mennyiség"
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}
