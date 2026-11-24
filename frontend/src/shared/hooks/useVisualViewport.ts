import { useEffect, useState } from 'react';

export function useVisualViewport(enabled: boolean) {
  const [viewport, setViewport] = useState<{ height: number; offsetTop: number }>();

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!enabled || !visualViewport) return;

    const update = () => {
      setViewport({ height: visualViewport.height, offsetTop: visualViewport.offsetTop });
    };

    update();
    visualViewport.addEventListener('resize', update);
    visualViewport.addEventListener('scroll', update);
    return () => {
      visualViewport.removeEventListener('resize', update);
      visualViewport.removeEventListener('scroll', update);
    };
  }, [enabled]);

  return viewport;
}
