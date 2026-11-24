import { useComputedColorScheme } from '@mantine/core';

export function useLightOrDefaultVariant() {
  return useComputedColorScheme('light') === 'light' ? 'light' : undefined;
}
