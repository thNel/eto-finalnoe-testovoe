import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { MoonIcon } from '@phosphor-icons/react/dist/csr/Moon';
import { SunIcon } from '@phosphor-icons/react/dist/csr/Sun';

export function ThemeSwitcher() {
  const { setColorScheme } = useMantineColorScheme();
  const colorScheme = useComputedColorScheme('light');
  const nextColorScheme = colorScheme === 'dark' ? 'light' : 'dark';
  const Icon = colorScheme === 'dark' ? MoonIcon : SunIcon;
  const description = nextColorScheme === 'dark'
    ? 'Включить тёмную тему'
    : 'Включить светлую тему';

  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label={description}
      title={description}
      onClick={() => setColorScheme(nextColorScheme)}
    >
      <Icon size={18} aria-hidden="true" />
    </ActionIcon>
  );
}
