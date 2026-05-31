'use client';

import { EntitySearchField } from '@/components/entity-search-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { searchCategoriesAction, searchSuppliersAction } from '../search-actions';
import { OptionalEnDeFields, hasEnDeContent } from '@/components/optional-en-de-fields';

function Field({
  id,
  label,
  name,
  type = 'text',
  required,
  defaultValue,
  className,
  disabled,
}: {
  id: string;
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        disabled={disabled}
      />
    </div>
  );
}

type LocaleDefaults = {
  sku?: string;
  supplierSku?: string;
  supplierNo?: string;
  brand?: string;
  ean?: string;
  names?: { hu?: string; en?: string; de?: string };
  descriptions?: { hu?: string; en?: string; de?: string };
  colors?: { hu?: string; en?: string; de?: string };
  length?: number;
  width?: number;
  height?: number;
  weightKg?: number;
  packageWeightKg?: number;
  packageVolumeM3?: number;
  priceRetailEur?: number;
  priceRetailHuf?: number;
  priceStreetEur?: number;
  priceStreetHuf?: number;
  priceMerchantEur?: number;
  priceMerchantHuf?: number;
  freightLevel?: number;
  stockLevelHint?: number;
  availabilityWeeks?: number;
  youtubeId?: string;
  youtubeVideo?: string;
  inCategories?: string;
  owner?: string;
  rentFeeDay?: number;
  rentFeeWeekend?: number;
  rentFeeWeek?: number;
  discount1Max?: number;
  discount2Owner?: number;
  rentFlag?: number;
  isActive?: boolean;
  isDiscontinued?: boolean;
};

export function ProductFormExcelSections({
  mode,
  defaults,
  compact = false,
}: {
  mode: 'create' | 'edit';
  defaults?: LocaleDefaults;
  compact?: boolean;
}) {
  const cardClassName = compact ? 'border-0 shadow-none' : undefined;

  return (
    <>
      <Card className={cardClassName}>
        <CardHeader className={compact ? 'px-0 pt-0' : undefined}>
          <CardTitle className={compact ? 'text-base' : undefined}>Azonosítók</CardTitle>
          {!compact && <CardDescription>Excel: product_id, product_id_SM, crm_*</CardDescription>}
        </CardHeader>
        <CardContent className={`grid gap-4 md:grid-cols-2 ${compact ? 'px-0' : ''}`}>
          <Field
            id="sku"
            label="CRM SKU (product_id_SM)"
            name="sku"
            required
            disabled={mode === 'edit'}
            defaultValue={defaults?.sku}
          />
          <Field
            id="product_id"
            label="Beszállítói SKU (product_id)"
            name="supplierSku"
            defaultValue={defaults?.supplierSku}
          />
          <Field
            id="supplierNo"
            label="Beszállítói szám (supplierNo)"
            name="supplierNo"
            defaultValue={defaults?.supplierNo}
          />
          <Field id="brand" label="Márka (brand)" name="brand" defaultValue={defaults?.brand} />
          <Field id="ean" label="EAN" name="ean" defaultValue={defaults?.ean} />
          <EntitySearchField
            label="Beszállító (crm_supplier_slug)"
            name="crm_supplier_slug"
            placeholder="Partner keresése…"
            onSearch={searchSuppliersAction}
          />
          <EntitySearchField
            label="CRM kategória (crm_category_slug)"
            name="crm_category_slug"
            placeholder="Kategória keresése…"
            onSearch={searchCategoriesAction}
          />
        </CardContent>
      </Card>

      <Card className={cardClassName}>
        <CardHeader className={compact ? 'px-0' : undefined}>
          <CardTitle className={compact ? 'text-base' : undefined}>Nevek és leírások</CardTitle>
        </CardHeader>
        <CardContent className={`grid gap-4 md:grid-cols-2 ${compact ? 'px-0' : ''}`}>
          <Field id="name_hu" label="Név (HU)" name="name_hu" defaultValue={defaults?.names?.hu} />
          <Field
            id="long_description_hu"
            label="Leírás (HU)"
            name="long_description_hu"
            className="md:col-span-2"
            defaultValue={defaults?.descriptions?.hu}
          />
          <OptionalEnDeFields
            className="md:col-span-2"
            defaultOpen={hasEnDeContent(defaults?.names) || hasEnDeContent(defaults?.descriptions)}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                id="name_en"
                label="Név (EN)"
                name="name_en"
                defaultValue={defaults?.names?.en}
              />
              <Field
                id="name_de"
                label="Név (DE)"
                name="name_de"
                defaultValue={defaults?.names?.de}
              />
              <Field
                id="long_description_en"
                label="Leírás (EN)"
                name="long_description_en"
                className="md:col-span-2"
                defaultValue={defaults?.descriptions?.en}
              />
              <Field
                id="long_description_de"
                label="Leírás (DE)"
                name="long_description_de"
                className="md:col-span-2"
                defaultValue={defaults?.descriptions?.de}
              />
            </div>
          </OptionalEnDeFields>
        </CardContent>
      </Card>

      <Card className={cardClassName}>
        <CardHeader className={compact ? 'px-0' : undefined}>
          <CardTitle className={compact ? 'text-base' : undefined}>Szín, méret, súly</CardTitle>
        </CardHeader>
        <CardContent className={`grid gap-4 md:grid-cols-2 ${compact ? 'px-0' : ''}`}>
          <Field
            id="Color_hu"
            label="Szín (HU)"
            name="Color_hu"
            defaultValue={defaults?.colors?.hu}
          />
          <OptionalEnDeFields
            className="md:col-span-2"
            defaultOpen={hasEnDeContent(defaults?.colors)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="Color_en"
                label="Szín (EN)"
                name="Color_en"
                defaultValue={defaults?.colors?.en}
              />
              <Field
                id="Color_de"
                label="Szín (DE)"
                name="Color_de"
                defaultValue={defaults?.colors?.de}
              />
            </div>
          </OptionalEnDeFields>
          <Field
            id="length"
            label="Hossz (mm)"
            name="length"
            type="number"
            defaultValue={defaults?.length}
          />
          <Field
            id="width"
            label="Szélesség (mm)"
            name="width"
            type="number"
            defaultValue={defaults?.width}
          />
          <Field
            id="height"
            label="Magasság (mm)"
            name="height"
            type="number"
            defaultValue={defaults?.height}
          />
          <Field
            id="weight"
            label="Súly (kg)"
            name="weight"
            type="number"
            defaultValue={defaults?.weightKg}
          />
          <Field
            id="packageweight"
            label="Csomag súly"
            name="packageweight"
            type="number"
            defaultValue={defaults?.packageWeightKg}
          />
          <Field
            id="packagevolume"
            label="Csomag térfogat (m³)"
            name="packagevolume"
            type="number"
            defaultValue={defaults?.packageVolumeM3}
          />
        </CardContent>
      </Card>

      <Card className={cardClassName}>
        <CardHeader className={compact ? 'px-0' : undefined}>
          <CardTitle className={compact ? 'text-base' : undefined}>Árak</CardTitle>
        </CardHeader>
        <CardContent className={`grid gap-4 md:grid-cols-2 ${compact ? 'px-0' : ''}`}>
          <Field
            id="recommendet_retail_price_with_german_tax"
            label="Ajánlott ár EUR"
            name="recommendet_retail_price_with_german_tax"
            type="number"
            defaultValue={defaults?.priceRetailEur}
          />
          <Field
            id="recommendet_retail_price_with_tax_HUF"
            label="Ajánlott ár HUF"
            name="recommendet_retail_price_with_tax_HUF"
            type="number"
            defaultValue={defaults?.priceRetailHuf}
          />
          <Field
            id="streetprice_with_german_tax"
            label="Utcaár EUR"
            name="streetprice_with_german_tax"
            type="number"
            defaultValue={defaults?.priceStreetEur}
          />
          <Field
            id="streetprice_without_HUN_tax_HUF"
            label="Utcaár HUF"
            name="streetprice_without_HUN_tax_HUF"
            type="number"
            defaultValue={defaults?.priceStreetHuf}
          />
          <Field
            id="merchant_price"
            label="Kereskedői ár EUR"
            name="merchant_price"
            type="number"
            defaultValue={defaults?.priceMerchantEur}
          />
          <Field
            id="merchant_price_HUF"
            label="Kereskedői ár HUF"
            name="merchant_price_HUF"
            type="number"
            defaultValue={defaults?.priceMerchantHuf}
          />
        </CardContent>
      </Card>

      <Card className={cardClassName}>
        <CardHeader className={compact ? 'px-0' : undefined}>
          <CardTitle className={compact ? 'text-base' : undefined}>Egyéb</CardTitle>
        </CardHeader>
        <CardContent className={`grid gap-4 md:grid-cols-2 ${compact ? 'px-0' : ''}`}>
          <Field
            id="freightlevel"
            label="Freight level"
            name="freightlevel"
            type="number"
            defaultValue={defaults?.freightLevel}
          />
          <Field
            id="stocklevel"
            label="Készlet szint"
            name="stocklevel"
            type="number"
            defaultValue={defaults?.stockLevelHint}
          />
          <Field
            id="availability_in_weeks"
            label="Elérhetőség (hét)"
            name="availability_in_weeks"
            type="number"
            defaultValue={defaults?.availabilityWeeks}
          />
          <Field
            id="youtubeid"
            label="YouTube ID"
            name="youtubeid"
            defaultValue={defaults?.youtubeId}
          />
          <Field
            id="youtubevideo"
            label="YouTube videó"
            name="youtubevideo"
            className="md:col-span-2"
            defaultValue={defaults?.youtubeVideo}
          />
          <Field
            id="inCategories"
            label="inCategories"
            name="inCategories"
            className="md:col-span-2"
            defaultValue={defaults?.inCategories}
          />
          <Field id="Owner" label="Owner" name="Owner" defaultValue={defaults?.owner} />
          <Field
            id="RentFeeDay"
            label="RentFeeDay"
            name="RentFeeDay"
            type="number"
            defaultValue={defaults?.rentFeeDay}
          />
          <Field
            id="RentFeeWeekend"
            label="RentFeeWeekend"
            name="RentFeeWeekend"
            type="number"
            defaultValue={defaults?.rentFeeWeekend}
          />
          <Field
            id="RentFeeWeek"
            label="RentFeeWeek"
            name="RentFeeWeek"
            type="number"
            defaultValue={defaults?.rentFeeWeek}
          />
          <Field
            id="Discont 1."
            label="Discont 1."
            name="Discont 1."
            type="number"
            defaultValue={defaults?.discount1Max}
          />
          <Field
            id="Discont 2."
            label="Discont 2."
            name="Discont 2."
            type="number"
            defaultValue={defaults?.discount2Owner}
          />
          <Field
            id="Rent"
            label="Rent flag"
            name="Rent"
            type="number"
            defaultValue={defaults?.rentFlag}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              defaultChecked={defaults?.isActive !== false}
              value="true"
            />
            <Label htmlFor="isActive">Aktív</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="discontinued"
              name="discontinued"
              value="1"
              defaultChecked={defaults?.isDiscontinued}
            />
            <Label htmlFor="discontinued">Kifutó (discontinued)</Label>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
