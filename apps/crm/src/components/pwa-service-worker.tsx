'use client';

import { useEffect } from 'react';

export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    if (!('serviceWorker' in navigator)) {
      return;
    }

    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Non-fatal — install prompt still shows manual steps on iOS.
    });
  }, []);

  return null;
}
