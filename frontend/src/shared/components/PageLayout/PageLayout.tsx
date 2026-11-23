import { Container, Stack } from '@mantine/core';

import styles from './PageLayout.module.css';
import type { PageLayoutProps } from './PageLayout.types';

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <Container component="main" size="lg" className={styles.root}>
      <Stack className={styles.content}>{children}</Stack>
    </Container>
  );
}
