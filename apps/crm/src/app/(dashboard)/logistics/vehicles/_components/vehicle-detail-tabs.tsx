'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@crm/ui';

export type VehicleDetailTab = 'overview' | 'documents' | 'incidents' | 'edit';

const TAB_LABELS: Record<VehicleDetailTab, string> = {
  overview: 'Áttekintés',
  documents: 'Dokumentumok',
  incidents: 'Incidensek',
  edit: 'Szerkesztés',
};

export function VehicleDetailTabs({
  activeTab,
  onTabChange,
  canWrite,
  openIncidentCount,
}: {
  activeTab: VehicleDetailTab;
  onTabChange: (tab: VehicleDetailTab) => void;
  canWrite: boolean;
  openIncidentCount: number;
}) {
  const tabs: VehicleDetailTab[] = canWrite
    ? ['overview', 'documents', 'incidents', 'edit']
    : ['overview', 'documents', 'incidents'];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b pb-2">
      {tabs.map((tab) => (
        <Button
          key={tab}
          type="button"
          variant={activeTab === tab ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onTabChange(tab)}
        >
          {TAB_LABELS[tab]}
          {tab === 'incidents' && openIncidentCount > 0 && (
            <span className="bg-destructive text-destructive-foreground ml-2 rounded-full px-2 py-0.5 text-xs">
              {openIncidentCount}
            </span>
          )}
        </Button>
      ))}
      <Button asChild variant="outline" size="sm" className="ml-auto">
        <Link href="/logistics/vehicles">Vissza a listához</Link>
      </Button>
    </div>
  );
}

export function VehicleDetailShell({
  children,
  title,
  subtitle,
  tabs,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  tabs: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
      </div>
      {tabs}
      <div>{children}</div>
    </div>
  );
}

export function useVehicleDetailTab(defaultTab: VehicleDetailTab = 'overview') {
  const [activeTab, setActiveTab] = useState<VehicleDetailTab>(defaultTab);
  return { activeTab, setActiveTab };
}
