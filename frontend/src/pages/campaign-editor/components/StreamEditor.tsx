import { Badge, Box, Button, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { useState } from 'react';

import type { OfferEdit } from '../../../shared/api/campaign-editor.dto';
import type { Offer } from '../../../shared/api/offers.dto';
import { OfferSelect } from '../../../shared/components/OfferSelect';
import styles from './StreamEditor.module.css';
import type { StreamEditorProps } from './StreamEditor.types';
import { StreamOfferRow } from './StreamOfferRow';

export function StreamEditor({ stream, busy, onEdit }: StreamEditorProps) {
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Offer | null>(null);

  function edit(offerId: number, operation: OfferEdit['operation'], share?: number) {
    return onEdit({ stream_id: stream.id, offer_id: offerId, operation, share });
  }

  async function add() {
    if (selected && await edit(selected.id, 'add')) {
      setSelected(null);
      setAdding(false);
    }
  }

  return (
    <Paper withBorder radius="md" className={styles.root}>
      <Stack>
        <Group className={styles.header}>
          <Stack className={styles.heading}>
            <Group className={styles.title}>
              <Title order={2} size="h4">{stream.name}</Title>
              {stream.edited && <Badge variant="light" color="yellow">Изменён</Badge>}
              {stream.state === 'disabled' && <Badge variant="light" color="gray">Отключён</Badge>}
            </Group>
            <Text size="sm" className={styles.muted}>Клики сегодня: {stream.clicks_today ?? 'нет данных'}</Text>
          </Stack>
          {stream.editable && !adding && (
            <Button variant="light" size="compact-sm" disabled={busy} onClick={() => setAdding(true)}>
              Добавить оффер
            </Button>
          )}
        </Group>
        {adding && (
          <Group className={styles.addOffer}>
            <Box className={styles.offerSelect}>
              <OfferSelect
                value={selected}
                onChange={setSelected}
                disabled={busy}
                excludedIds={stream.offers.filter((offer) => offer.state !== 'removed').map((offer) => offer.id)}
              />
            </Box>
            <Button size="sm" disabled={busy || !selected} onClick={() => void add()}>Добавить</Button>
            <Button
              variant="default"
              size="sm"
              disabled={busy}
              onClick={() => { setAdding(false); setSelected(null); }}
            >
              Отмена
            </Button>
          </Group>
        )}
        {stream.offers.length === 0 ? (
          <Text size="sm" className={styles.muted}>В потоке нет офферов.</Text>
        ) : (
          <Table.ScrollContainer minWidth={600}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Оффер</Table.Th>
                  <Table.Th>В Keitaro</Table.Th>
                  <Table.Th>{stream.edited ? 'В черновике' : 'Доля, %'}</Table.Th>
                  <Table.Th>Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {stream.offers.map((offer) => (
                  <StreamOfferRow
                    key={offer.id}
                    offer={offer}
                    editable={stream.editable}
                    busy={busy}
                    onEdit={edit}
                  />
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>
    </Paper>
  );
}
