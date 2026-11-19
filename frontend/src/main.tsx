import '@mantine/core/styles.css';

import { Container, MantineProvider, Stack, Text, Title } from '@mantine/core';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const statusText = {
  checking: 'Проверяем подключение к API…',
  ready: 'API доступен',
  unavailable: 'API недоступен',
};

function App() {
  const [status, setStatus] = useState<keyof typeof statusText>('checking');

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth() {
      try {
        const response = await fetch('/api/v1/health', { signal: controller.signal });
        if (!response.ok) throw new Error('Health check failed');

        const body: { status?: string } = await response.json();
        if (!controller.signal.aborted) {
          setStatus(body.status === 'ok' ? 'ready' : 'unavailable');
        }
      } catch {
        if (!controller.signal.aborted) setStatus('unavailable');
      }
    }

    void checkHealth();
    return () => controller.abort();
  }, []);

  return (
    <Container component="main" size="sm" py="xl">
      <Stack gap="sm">
        <Title order={1}>Управление кампаниями Keitaro</Title>
        <Text role="status" c={status === 'unavailable' ? 'red' : undefined}>
          {statusText[status]}
        </Text>
      </Stack>
    </Container>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider>
      <App />
    </MantineProvider>
  </StrictMode>,
);
