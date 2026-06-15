'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VehicleComplianceWarning, VehicleIncidentListItem } from '@crm/core';
import { EditVehicleForm } from './vehicle-edit-form';
import { VehicleIncidentReportForm } from './vehicle-incident-form';
import { VehicleIncidentsList } from './vehicle-incidents-list';
import { VehicleDetailShell, VehicleDetailTabs, useVehicleDetailTab } from './vehicle-detail-tabs';

type CompanyInfo = {
  _id: string;
  name: string;
  slug: string;
  companyDataEntries: Array<{ key: string; value: string }>;
};

function formatDueDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'yyyy. MMM d.', { locale: hu });
}

function ComplianceAlert({ label, dueDate }: { label: string; dueDate?: string }) {
  if (!dueDate) return null;
  const days = Math.round(
    (new Date(dueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
  );
  const isOverdue = days < 0;
  const isSoon = days >= 0 && days <= 30;

  if (!isOverdue && !isSoon) return null;

  return (
    <p
      className={
        isOverdue ? 'text-sm font-medium text-red-600' : 'text-sm font-medium text-amber-700'
      }
    >
      {label}: {formatDueDate(dueDate)}
      {isOverdue ? ' (lejárt)' : ` (${days} nap múlva)`}
    </p>
  );
}

function OverviewTab({
  vehicle,
  company,
  warnings,
}: {
  vehicle: {
    name: string;
    plateNumber: string;
    lengthMm: number;
    widthMm: number;
    heightMm: number;
    maxWeightKg: number;
    maxVolumeM3: number;
    isActive: boolean;
    registrationDueDate?: string;
    insuranceDueDate?: string;
  };
  company?: CompanyInfo;
  warnings: VehicleComplianceWarning[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Műszaki adatok</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Rendszám:</span> {vehicle.plateNumber}
          </p>
          <p>
            <span className="text-muted-foreground">Raktér:</span> {vehicle.lengthMm} ×{' '}
            {vehicle.widthMm} × {vehicle.heightMm} mm
          </p>
          <p>
            <span className="text-muted-foreground">Max. súly:</span> {vehicle.maxWeightKg} kg
          </p>
          <p>
            <span className="text-muted-foreground">Max. térfogat:</span> {vehicle.maxVolumeM3} m³
          </p>
          <p>
            <span className="text-muted-foreground">Státusz:</span>{' '}
            {vehicle.isActive ? 'Aktív' : 'Inaktív'}
          </p>
          <ComplianceAlert label="Forgalmi lejárat" dueDate={vehicle.registrationDueDate} />
          <ComplianceAlert label="Biztosítás lejárat" dueDate={vehicle.insuranceDueDate} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tulajdonos cég</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {company ? (
            <>
              <p className="font-medium">{company.name}</p>
              <p className="text-muted-foreground">{company.slug}</p>
              {company.companyDataEntries.length > 0 ? (
                <dl className="mt-2 space-y-1">
                  {company.companyDataEntries.map((entry) => (
                    <div key={entry.key} className="flex gap-2">
                      <dt className="text-muted-foreground min-w-24">{entry.key}:</dt>
                      <dd>{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-muted-foreground">Nincs egyedi cég adat.</p>
              )}
              <Link
                href={`/accounting/companies/${company._id}`}
                className="text-primary mt-2 inline-block text-sm hover:underline"
              >
                Cég megnyitása
              </Link>
            </>
          ) : (
            <p className="text-muted-foreground">Nincs hozzárendelt cég.</p>
          )}
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <Card className="border-amber-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-amber-800">Közelgő lejáratok</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {warnings.map((warning) => (
                <li key={`${warning.kind}-${warning.dueDate}`}>
                  {warning.kind === 'registration' ? 'Forgalmi' : 'Biztosítás'}:{' '}
                  {formatDueDate(warning.dueDate)}
                  {warning.isOverdue ? ' (lejárt)' : ` (${warning.daysUntilDue} nap múlva)`}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DocumentsTab({
  imageIds,
  licenseFileId,
  registrationFileId,
  insuranceFileId,
  registrationDueDate,
  insuranceDueDate,
}: {
  imageIds: string[];
  licenseFileId?: string;
  registrationFileId?: string;
  insuranceFileId?: string;
  registrationDueDate?: string;
  insuranceDueDate?: string;
}) {
  const docItems = [
    { id: licenseFileId, label: 'Jogosítvány' },
    { id: registrationFileId, label: 'Forgalmi engedély', dueDate: registrationDueDate },
    { id: insuranceFileId, label: 'Biztosítás', dueDate: insuranceDueDate },
  ].filter((item) => item.id);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-base font-semibold">Jármű képek</h2>
        {imageIds.length > 0 ? (
          <ul className="flex flex-wrap gap-3">
            {imageIds.map((id) => (
              <li key={id}>
                <a
                  href={`/api/inventory/images/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-md border"
                >
                  <img
                    src={`/api/inventory/images/${id}`}
                    alt="Jármű kép"
                    className="size-32 object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Nincs feltöltött kép.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Dokumentumok</h2>
        {docItems.length > 0 ? (
          <ul className="space-y-3">
            {docItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">{item.label}</p>
                  {'dueDate' in item && item.dueDate && (
                    <p className="text-muted-foreground text-xs">
                      Lejárat: {formatDueDate(item.dueDate)}
                    </p>
                  )}
                </div>
                <a
                  href={`/api/inventory/images/${item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm hover:underline"
                >
                  Megnyitás
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Nincs feltöltött dokumentum.</p>
        )}
      </section>
    </div>
  );
}

export function VehicleDetailClient({
  vehicle,
  company,
  companies,
  incidents,
  warnings,
  canWrite,
  canReportIncident,
}: {
  vehicle: {
    _id: string;
    name: string;
    plateNumber: string;
    lengthMm: number;
    widthMm: number;
    heightMm: number;
    maxWeightKg: number;
    maxVolumeM3: number;
    isActive: boolean;
    companyId?: string;
    registrationDueDate?: string;
    insuranceDueDate?: string;
    imageIds: string[];
    licenseFileId?: string;
    registrationFileId?: string;
    insuranceFileId?: string;
  };
  company?: CompanyInfo;
  companies: Array<{ _id: string; name: string }>;
  incidents: VehicleIncidentListItem[];
  warnings: VehicleComplianceWarning[];
  canWrite: boolean;
  canReportIncident: boolean;
}) {
  const { activeTab, setActiveTab } = useVehicleDetailTab('overview');
  const openIncidentCount = incidents.filter((i) => i.status === 'reported').length;

  return (
    <VehicleDetailShell
      title={vehicle.name}
      subtitle={vehicle.plateNumber}
      tabs={
        <VehicleDetailTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          canWrite={canWrite}
          openIncidentCount={openIncidentCount}
        />
      }
    >
      {activeTab === 'overview' && (
        <OverviewTab vehicle={vehicle} company={company} warnings={warnings} />
      )}
      {activeTab === 'documents' && (
        <DocumentsTab
          imageIds={vehicle.imageIds}
          licenseFileId={vehicle.licenseFileId}
          registrationFileId={vehicle.registrationFileId}
          insuranceFileId={vehicle.insuranceFileId}
          registrationDueDate={vehicle.registrationDueDate}
          insuranceDueDate={vehicle.insuranceDueDate}
        />
      )}
      {activeTab === 'incidents' && (
        <div className="flex flex-col gap-6">
          {canReportIncident ? (
            <VehicleIncidentReportForm vehicleId={vehicle._id} />
          ) : (
            <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
              Incidens bejelentéshez a <span className="font-medium">Report vehicle incidents</span>{' '}
              (<code className="text-xs">logistics:vehicles:report</code>) jogosultság szükséges.
              Kérje az adminisztrátortól a Fiók → Jogosultságok menüben.
            </p>
          )}
          <VehicleIncidentsList
            vehicleId={vehicle._id}
            incidents={incidents}
            canMarkFixed={canWrite}
          />
        </div>
      )}
      {activeTab === 'edit' && canWrite && (
        <EditVehicleForm vehicle={vehicle} companies={companies} />
      )}
    </VehicleDetailShell>
  );
}
