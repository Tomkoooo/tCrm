'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { shellTourSteps } from './steps';

function isVisible(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Starts the guided shell tour. Resolves each step's selector against the live
 * DOM right before driving, so a step for an element that isn't rendered right
 * now (hidden admin nav, collapsed mobile sidebar sheet, missing permission)
 * is silently dropped instead of breaking the whole tour.
 */
export function useShellTour() {
  const startTour = useCallback(() => {
    const resolvedSteps = shellTourSteps
      .map((step) => {
        const element = document.querySelector(step.selector);
        return element && isVisible(element) ? { element, step } : null;
      })
      .filter((entry): entry is { element: HTMLElement; step: (typeof shellTourSteps)[number] } =>
        Boolean(entry)
      );

    if (resolvedSteps.length === 0) {
      toast.error('A bemutató jelenleg nem elérhető ezen az oldalon.');
      return;
    }

    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Következő',
      prevBtnText: 'Vissza',
      doneBtnText: 'Kész',
      progressText: '{{current}} / {{total}}',
      steps: resolvedSteps.map(({ element, step }) => ({
        element,
        popover: {
          title: step.title,
          description: step.description,
          // All current steps target the (narrow) sidebar — anchor into the open
          // main content area instead of overlapping adjacent nav items.
          side: 'right' as const,
          align: 'start' as const,
        },
      })),
    });

    driverObj.drive();
  }, []);

  return { startTour };
}
