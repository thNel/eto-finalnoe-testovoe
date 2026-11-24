import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { Button, createTheme, MantineProvider, Notification, Title } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppRouter } from './AppRouter';
import styles from './theme.module.css';

const theme = createTheme({
  components: {
    Button: Button.extend({ classNames: { root: styles.button } }),
    Notification: Notification.extend({
      classNames: {
        root: styles.notification,
        title: styles.notificationText,
        description: styles.notificationText,
        closeButton: styles.notificationClose,
      },
    }),
    Title: Title.extend({ classNames: { root: styles.title } }),
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="auto" theme={theme}>
      <Notifications position="top-right" autoClose={4000} />
      <AppRouter />
    </MantineProvider>
  </StrictMode>,
);
