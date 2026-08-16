'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { MediaSelector } from '@/components/media/media-selector';
import type { SelectedMedia } from '@/lib/media-types';
import type { ProductTableRow } from '@/lib/inventory/product-table-columns';
import type { InventoryFormState, ProductEditContext } from '../actions';
import { updateProductAction } from '../actions';
import { ComponentLinesEditor } from './component-lines-editor';
import { ProductEditSection } from './product-edit-section';
import { ProductFormExcelSections } from './product-form-excel';
import { ProductStockEditor } from './product-stock-editor';
import { useProductEditSections, PRODUCT_EDIT_SECTION_DEFAULTS } from './use-product-edit-sections';
import { Button } from '@crm/ui';

function mediaFromIds(ids: string[], labelPrefix: string): SelectedMedia[] {
  return ids.map((id, index) => ({
    id,
    previewUrl: `/api/inventory/images/${id}`,
    filename: `${labelPrefix} ${index + 1}`,
    type: 'file' as const,
  }));
}

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

export function ProductEditForm({
  row,
  editContext,
  onSuccess,
  onCancel,
}: {
  row: ProductTableRow;
  editContext: ProductEditContext;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const { sections, setOpen, ready } = useProductEditSections();
  const [images, setImages] = useState<SelectedMedia[]>(() =>
    mediaFromIds(editContext.imageIds, 'Kép')
  );
  const [guideMedia, setGuideMedia] = useState<SelectedMedia[]>(() =>
    mediaFromIds(editContext.assemblyGuideMediaIds, 'Útmutató')
  );
  const [assemblyGuide, setAssemblyGuide] = useState(editContext.assemblyGuide ?? '');

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

  const accordion = {
    sections: ready ? sections : PRODUCT_EDIT_SECTION_DEFAULTS,
    setOpen,
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="sku" value={row.sku} />

      {state.success === false && state.fieldErrors && (
        <ul className="text-destructive list-inside list-disc text-sm">
          {Object.entries(state.fieldErrors).map(([k, msgs]) => (
            <li key={k}>
              {k}: {msgs.join(', ')}
            </li>
          ))}
        </ul>
      )}

      <ProductFormExcelSections
        mode="edit"
        compact
        defaults={rowToFormDefaults(row)}
        accordion={accordion}
      />

      <ProductEditSection
        sectionId="stock"
        title="Készlet raktáronként"
        description="Abszolút készletszint beállítása raktáranként."
        open={accordion.sections.stock}
        onOpenChange={(open) => setOpen('stock', open)}
        compact
      >
        <ProductStockEditor
          initialLevels={editContext.stockLevels}
          isGlobalScope={editContext.isGlobalScope}
          systemWarehouseCount={editContext.systemWarehouseCount}
        />
      </ProductEditSection>

      <ProductEditSection
        sectionId="bom"
        title="Alkatrészlista (BOM)"
        description="Összeszerelés alkatrészei — üres lista esetén egyszerű termék."
        open={accordion.sections.bom}
        onOpenChange={(open) => setOpen('bom', open)}
        compact
      >
        <ComponentLinesEditor initial={editContext.components} />
      </ProductEditSection>

      <ProductEditSection
        sectionId="guide"
        title="Összeszerelési útmutató"
        open={accordion.sections.guide}
        onOpenChange={(open) => setOpen('guide', open)}
        compact
      >
        <textarea
          id="assemblyGuide"
          name="assemblyGuide"
          rows={6}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Lépések, megjegyzések, link a dokumentációhoz…"
          value={assemblyGuide}
          onChange={(e) => setAssemblyGuide(e.target.value)}
        />
      </ProductEditSection>

      <ProductEditSection
        sectionId="images"
        title="Termékképek"
        description="Médiatárból — több kép is csatolható."
        open={accordion.sections.images}
        onOpenChange={(open) => setOpen('images', open)}
        compact
      >
        <MediaSelector
          value={images}
          onChange={setImages}
          multiple
          maxCount={5}
          name="imageId"
          uploadPermissionKeys={['inventory:write']}
          description="Excel import bild URL-ek a médiatárban linkként is kezelhetők."
        />
      </ProductEditSection>

      <ProductEditSection
        sectionId="guideFiles"
        title="Útmutató fájlok"
        description="PDF vagy kép — összeszerelési dokumentáció."
        open={accordion.sections.guideFiles}
        onOpenChange={(open) => setOpen('guideFiles', open)}
        compact
      >
        <MediaSelector
          label="Útmutató fájlok"
          value={guideMedia}
          onChange={setGuideMedia}
          multiple
          maxCount={5}
          name="guideMediaId"
          uploadPermissionKeys={['inventory:write']}
        />
      </ProductEditSection>

      <div className="flex gap-2 border-t pt-4">
        <Button type="submit" loading={pending} loadingText="Mentés…">
          Változtatások mentése
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Mégse
          </Button>
        ) : null}
      </div>
    </form>
  );
}
