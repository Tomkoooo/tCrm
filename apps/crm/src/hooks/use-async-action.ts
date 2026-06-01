'use client';

import { useCallback, useState } from 'react';

/** Wraps an async handler with a pending flag for Button `loading`. */
export function useAsyncAction<T extends unknown[]>(
  action: (...args: T) => Promise<void>
): [(...args: T) => void, boolean] {
  const [pending, setPending] = useState(false);

  const run = useCallback(
    (...args: T) => {
      if (pending) return;
      setPending(true);
      void action(...args)
        .catch(() => {
          /* caller handles errors */
        })
        .finally(() => {
          setPending(false);
        });
    },
    [action, pending]
  );

  return [run, pending];
}
