'use client';

import { CompassIcon } from 'lucide-react';
import { Button } from '@crm/ui';
import { useShellTour } from '@/lib/tour/use-shell-tour';

export function StartTourButton() {
  const { startTour } = useShellTour();

  return (
    <Button type="button" variant="outline" size="sm" onClick={startTour}>
      <CompassIcon className="h-4 w-4" />
      Vezetett bemutató
    </Button>
  );
}
