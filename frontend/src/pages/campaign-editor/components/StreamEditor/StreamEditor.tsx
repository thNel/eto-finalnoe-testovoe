import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';

import type { OfferEdit } from '@/shared/api/campaign-editor/campaign-editor.dto';
import { BreakableText } from '@/shared/components/BreakableText/BreakableText';
import { DataTable } from '@/shared/components/DataTable/DataTable';
import { useLightOrDefaultVariant } from '@/shared/hooks/useLightOrDefaultVariant';
import { StreamOfferPicker } from '../StreamOfferPicker/StreamOfferPicker';
import { StreamOfferRow } from '../StreamOfferRow/StreamOfferRow';
import styles from './StreamEditor.module.css';
import type { StreamEditorProps } from './StreamEditor.types';

export function StreamEditor({ stream, busy, onEdit }: StreamEditorProps) {
  const [adding, setAdding] = useState(false);
  const variant = useLightOrDefaultVariant();
  const columns = ['Оффер', 'В Keitaro', stream.edited ? 'В черновике' : 'Доля, %', 'Действия'];

  function edit(offerId: number, operation: OfferEdit['operation'], share?: number) {
    return onEdit({ stream_id: stream.id, offer_id: offerId, operation, share });
  }

  return (
    <Paper withBorder radius="md" className={styles.root}>
      <Stack>
        <Group className={styles.header}>
          <Stack className={styles.heading}>
            <Group className={styles.title}>
              <Title order={2} size="h4">
                <BreakableText>{stream.name}</BreakableText>
              </Title>
              {stream.edited && <Badge variant={variant} color="yellow">Изменён</Badge>}
              {stream.state === 'disabled' && <Badge variant={variant} color="gray">Отключён</Badge>}
            </Group>
            <Text size="sm" className={styles.muted}>Клики сегодня: {stream.clicks_today ?? 'нет данных'}</Text>
          </Stack>
          {stream.editable && !adding && (
            <Button variant={variant} size="sm" disabled={busy} onClick={() => setAdding(true)}>
              Добавить оффер
            </Button>
          )}
        </Group>
        {adding && (
          <StreamOfferPicker
            busy={busy}
            excludedIds={stream.offers.filter((offer) => offer.state !== 'removed').map((offer) => offer.id)}
            onAdd={(offerId) => edit(offerId, 'add')}
            onClose={() => setAdding(false)}
          />
        )}
        {stream.offers.length === 0 ? (
          <Text size="sm" className={styles.muted}>В потоке нет офферов.</Text>
        ) : (
          <DataTable columns={columns} minWidth={600}>
            {stream.offers.map((offer) => (
              <StreamOfferRow key={offer.id} offer={offer} editable={stream.editable} busy={busy} onEdit={edit} />
            ))}
          </DataTable>
        )}
      </Stack>
    </Paper>
  );
}
