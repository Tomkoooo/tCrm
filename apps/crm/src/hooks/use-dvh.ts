'use client';

import { useEffect, useState } from 'react';

export default function useDvh() {
  const [dvh, setDvh] = useState('vh');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.CSS.supports('height: 100dvh')) {
      setDvh('dvh');
    }
  }, []);

  return dvh;
}
