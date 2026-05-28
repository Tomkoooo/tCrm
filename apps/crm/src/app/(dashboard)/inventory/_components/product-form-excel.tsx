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
  names?: { hu?: string; en?: string; de?: string };
  descriptions?: { hu?: string; en?: string; de?: string };
  colors?: { hu?: string; en?: string; de?: string };
};

export function ProductFormExcelSections({
  mode,
  defaults,
}: {
  mode: 'create' | 'edit';
  defaults?: LocaleDefaults;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Azonosítók</CardTitle>
          <CardDescription>Excel: product_id, product_id_SM, crm_*</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field
            id="sku"
            label="CRM SKU (product_id_SM)"
            name="sku"
            required
            disabled={mode === 'edit'}
          />
          <Field id="product_id" label="Beszállítói SKU (product_id)" name="supplierSku" />
          <Field id="supplierNo" label="Beszállítói szám (supplierNo)" name="supplierNo" />
          <Field id="brand" label="Márka (brand)" name="brand" />
          <Field id="ean" label="EAN" name="ean" />
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

      <Card>
        <CardHeader>
          <CardTitle>Nevek és leírások</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Szín, méret, súly</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
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
          <Field id="length" label="Hossz (mm)" name="length" type="number" />
          <Field id="width" label="Szélesség (mm)" name="width" type="number" />
          <Field id="height" label="Magasság (mm)" name="height" type="number" />
          <Field id="weight" label="Súly (kg)" name="weight" type="number" />
          <Field id="packageweight" label="Csomag súly" name="packageweight" type="number" />
          <Field
            id="packagevolume"
            label="Csomag térfogat (m³)"
            name="packagevolume"
            type="number"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Árak</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field
            id="recommendet_retail_price_with_german_tax"
            label="Ajánlott ár EUR"
            name="recommendet_retail_price_with_german_tax"
            type="number"
          />
          <Field
            id="recommendet_retail_price_with_tax_HUF"
            label="Ajánlott ár HUF"
            name="recommendet_retail_price_with_tax_HUF"
            type="number"
          />
          <Field
            id="streetprice_with_german_tax"
            label="Utcaár EUR"
            name="streetprice_with_german_tax"
            type="number"
          />
          <Field
            id="streetprice_without_HUN_tax_HUF"
            label="Utcaár HUF"
            name="streetprice_without_HUN_tax_HUF"
            type="number"
          />
          <Field
            id="merchant_price"
            label="Kereskedői ár EUR"
            name="merchant_price"
            type="number"
          />
          <Field
            id="merchant_price_HUF"
            label="Kereskedői ár HUF"
            name="merchant_price_HUF"
            type="number"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Egyéb</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="freightlevel" label="Freight level" name="freightlevel" type="number" />
          <Field id="stocklevel" label="Készlet szint" name="stocklevel" type="number" />
          <Field
            id="availability_in_weeks"
            label="Elérhetőség (hét)"
            name="availability_in_weeks"
            type="number"
          />
          <Field id="youtubeid" label="YouTube ID" name="youtubeid" />
          <Field
            id="youtubevideo"
            label="YouTube videó"
            name="youtubevideo"
            className="md:col-span-2"
          />
          <Field
            id="inCategories"
            label="inCategories"
            name="inCategories"
            className="md:col-span-2"
          />
          <Field id="Owner" label="Owner" name="Owner" />
          <Field id="RentFeeDay" label="RentFeeDay" name="RentFeeDay" type="number" />
          <Field id="RentFeeWeekend" label="RentFeeWeekend" name="RentFeeWeekend" type="number" />
          <Field id="RentFeeWeek" label="RentFeeWeek" name="RentFeeWeek" type="number" />
          <Field id="Discont 1." label="Discont 1." name="Discont 1." type="number" />
          <Field id="Discont 2." label="Discont 2." name="Discont 2." type="number" />
          <Field id="Rent" label="Rent flag" name="Rent" type="number" />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" name="isActive" defaultChecked value="true" />
            <Label htmlFor="isActive">Aktív</Label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="discontinued" name="discontinued" value="1" />
            <Label htmlFor="discontinued">Kifutó (discontinued)</Label>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
