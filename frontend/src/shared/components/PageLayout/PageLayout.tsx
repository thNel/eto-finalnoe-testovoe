import { Container, Group, Stack } from '@mantine/core';

import { ThemeSwitcher } from '../ThemeSwitcher/ThemeSwitcher';
import styles from './PageLayout.module.css';
import type { PageLayoutProps } from './PageLayout.types';

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <Container size="lg" className={styles.root}>
      <Stack component="main" className={styles.content}>
        {children}
      </Stack>
      <Group component="footer" justify="flex-end">
        <ThemeSwitcher />
      </Group>
    </Container>
  );
}
