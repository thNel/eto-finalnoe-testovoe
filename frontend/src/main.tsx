import '@mantine/core/styles.css';

import { Button, createTheme, MantineProvider, Title } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppRouter } from './AppRouter';
import styles from './theme.module.css';

const theme = createTheme({
  components: {
    Button: Button.extend({ classNames: { root: styles.button } }),
    Title: Title.extend({ classNames: { root: styles.title } }),
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="auto" theme={theme}>
      <AppRouter />
    </MantineProvider>
  </StrictMode>,
);
