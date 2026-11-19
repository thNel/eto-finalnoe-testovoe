import { Alert, Anchor, Badge, Button, Container, Group, Loader, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';

import { type CampaignPage, type CreatedCampaign, listCampaigns } from './api';
import { CampaignForm } from './CampaignForm';

const PAGE_SIZE = 25;

const states: Record<string, { label: string; color: string }> = {
  active: { label: 'Активна', color: 'teal' },
  disabled: { label: 'Отключена', color: 'gray' },
  deleted: { label: 'В архиве', color: 'gray' },
};

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; data: CampaignPage }
  | { status: 'error'; message: string };

export function CampaignsPage() {
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [page, setPage] = useState(0);
  const [request, setRequest] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [created, setCreated] = useState<CreatedCampaign | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listCampaigns(page * PAGE_SIZE, PAGE_SIZE, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setList({ status: 'ready', data }); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setList({
            status: 'error',
            message: error instanceof Error ? error.message : 'Не удалось загрузить кампании.',
          });
        }
      });
    return () => controller.abort();
  }, [page, request]);

  function loadPage(nextPage: number) {
    setList({ status: 'loading' });
    setPage(nextPage);
    setRequest((value) => value + 1);
  }

  function showCreated(campaign: CreatedCampaign) {
    setFormOpen(false);
    setCreated(campaign);
    loadPage(0);
  }

  return (
    <Container component="main" size="lg" py={{ base: 'lg', sm: 48 }}>
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={1}>Кампании Keitaro</Title>
          <Button onClick={() => { setCreated(null); setFormOpen(true); }}>Новая кампания</Button>
        </Group>
        {created && (
          <Alert color="teal" title={`Кампания «${created.name}» создана`} role="status">
            <Group gap="md">
              <Anchor href={`/campaigns/${created.id}`}>Открыть редактор</Anchor>
              <Anchor href={created.tracking_url} target="_blank" rel="noopener noreferrer">Ссылка кампании</Anchor>
              <Anchor href={created.admin_url} target="_blank" rel="noopener noreferrer">Открыть в Keitaro</Anchor>
            </Group>
          </Alert>
        )}
        {list.status === 'loading' && (
          <Group role="status"><Loader size="sm" /><Text c="dimmed">Загрузка кампаний…</Text></Group>
        )}
        {list.status === 'error' && (
          <Alert color="red" title="Не удалось загрузить кампании" role="alert">
            <Group gap="sm">
              <Text size="sm">{list.message}</Text>
              <Button size="compact-sm" variant="default" onClick={() => loadPage(page)}>Повторить</Button>
            </Group>
          </Alert>
        )}
        {list.status === 'ready' && (
          <>
            {list.data.items.length === 0 ? (
              <Paper withBorder p="lg" radius="md"><Text c="dimmed">Кампаний на этой странице пока нет.</Text></Paper>
            ) : (
              <Paper withBorder radius="md">
                <Table.ScrollContainer minWidth={440}>
                  <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                    <Table.Thead><Table.Tr>
                      <Table.Th>Кампания</Table.Th>
                      <Table.Th>Статус</Table.Th>
                      <Table.Th>Действие</Table.Th>
                    </Table.Tr></Table.Thead>
                    <Table.Tbody>
                      {list.data.items.map((campaign) => (
                        <Table.Tr key={campaign.id}>
                          <Table.Td>
                            <Text size="sm" fw={600}>{campaign.name}</Text>
                            <Text size="xs" c="dimmed">#{campaign.id}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light" color={states[campaign.state]?.color ?? 'gray'}>
                              {states[campaign.state]?.label ?? campaign.state}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Anchor href={`/campaigns/${campaign.id}`} size="sm">Редактировать</Anchor>
                              <Anchor href={campaign.admin_url} size="sm" target="_blank" rel="noopener noreferrer">
                                Открыть в Keitaro
                              </Anchor>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Paper>
            )}
            <Group justify="flex-end">
              <Button variant="default" disabled={page === 0} onClick={() => loadPage(page - 1)}>Назад</Button>
              <Text size="sm" c="dimmed">Страница {page + 1}</Text>
              <Button variant="default" disabled={!list.data.has_more} onClick={() => loadPage(page + 1)}>Далее</Button>
            </Group>
          </>
        )}
      </Stack>
      {formOpen && <CampaignForm onClose={() => setFormOpen(false)} onCreated={showCreated} />}
    </Container>
  );
}
