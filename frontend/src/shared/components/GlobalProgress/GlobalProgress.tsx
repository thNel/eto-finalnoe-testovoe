import 'nprogress/nprogress.css';

import { VisuallyHidden } from '@mantine/core';
import NProgress from 'nprogress';
import { useEffect } from 'react';

import type { GlobalProgressProps } from './GlobalProgress.types';

NProgress.configure({ showSpinner: false, minimum: 0.1, trickleSpeed: 150 });

export function GlobalProgress({ active }: GlobalProgressProps) {
  useEffect(() => {
    if (!active) return;

    let started = false;
    const timer = window.setTimeout(() => {
      started = true;
      NProgress.start();
    }, 200);

    return () => {
      window.clearTimeout(timer);
      if (started) NProgress.done();
    };
  }, [active]);

  return <VisuallyHidden role="status">{active ? 'Выполняем запрос…' : ''}</VisuallyHidden>;
}
