'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { ProductTableRow } from '@/lib/inventory/product-table-columns';
import type { InventoryFormState } from '../actions';
import { updateProductAction } from '../actions';
import { ProductFormExcelSections } from './product-form-excel';

function rowToFormDefaults(row: ProductTableRow) {
  return {
    sku: row.sku,
    supplierSku: row.supplierSku,
    supplierNo: row.supplierNo,
    brand: row.brand,
    ean: row.ean,
    names: { hu: row.name_hu, en: row.name_en, de: row.name_de },
    descriptions: { hu: row.desc_hu, en: row.desc_en, de: row.desc_de },
    colors: { hu: row.color_hu, en: row.color_en, de: row.color_de },
    length: row.length,
    width: row.width,
    height: row.height,
    weightKg: row.weightKg,
    packageWeightKg: row.packageWeightKg,
    packageVolumeM3: row.packageVolumeM3,
    priceRetailEur: row.priceRetailEur,
    priceRetailHuf: row.priceRetailHuf,
    priceStreetEur: row.priceStreetEur,
    priceStreetHuf: row.priceStreetHuf,
    priceMerchantEur: row.priceMerchantEur,
    priceMerchantHuf: row.priceMerchantHuf,
    freightLevel: row.freightLevel,
    stockLevelHint: row.stockLevelHint,
    availabilityWeeks: row.availabilityWeeks,
    youtubeId: row.youtubeId,
    youtubeVideo: row.youtubeVideo,
    inCategories: row.inCategories,
    owner: row.owner,
    rentFeeDay: row.rentFeeDay,
    rentFeeWeekend: row.rentFeeWeekend,
    rentFeeWeek: row.rentFeeWeek,
    discount1Max: row.discount1Max,
    discount2Owner: row.discount2Owner,
    rentFlag: row.rentFlag,
    isActive: row.isActive,
    isDiscontinued: row.isDiscontinued,
  };
}

export function EditProductSheetForm({
  row,
  onSuccess,
}: {
  row: ProductTableRow;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateProductAction, {
    success: false,
  } as InventoryFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Termék mentve.');
      onSuccess?.();
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, onSuccess, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.success === false && state.fieldErrors && (
        <ul className="text-destructive list-inside list-disc text-sm">
          {Object.entries(state.fieldErrors).map(([k, msgs]) => (
            <li key={k}>
              {k}: {msgs.join(', ')}
            </li>
          ))}
        </ul>
      )}

      <ProductFormExcelSections mode="edit" compact defaults={rowToFormDefaults(row)} />

      <div className="flex gap-2 border-t pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Mentés…' : 'Változtatások mentése'}
        </Button>
      </div>
    </form>
  );
}
