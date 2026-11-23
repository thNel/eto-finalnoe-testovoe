import { Badge, Box, Button, Group, NumberInput, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { useState } from 'react';

import { type EditorOffer, type EditorStream, type OfferEdit } from '../../../shared/api/campaign-editor';
import { type Offer } from '../../../shared/api/offers';
import { OfferSelect } from '../../../shared/components/OfferSelect';

interface StreamEditorProps {
  stream: EditorStream;
  busy: boolean;
  onEdit: (edit: OfferEdit) => Promise<boolean>;
}

function ShareInput({
  offer, disabled, onSave,
}: {
  offer: EditorOffer;
  disabled: boolean;
  onSave: (share: number) => void;
}) {
  const [value, setValue] = useState<string | number>(offer.share);

  return (
    <NumberInput
      aria-label={`Доля оффера ${offer.name}`}
      value={value}
      onChange={setValue}
      onBlur={() => {
        setValue(offer.share);
        if (typeof value === 'number' && value !== offer.share) onSave(value);
      }}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      disabled={disabled}
      min={0}
      max={100}
      allowDecimal={false}
      hideControls
      size="xs"
      w={65}
    />
  );
}

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
    <Paper withBorder radius="md" p="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Group gap="xs">
              <Title order={2} size="h4">{stream.name}</Title>
              {stream.edited && <Badge variant="light" color="yellow">Изменён</Badge>}
              {stream.state === 'disabled' && <Badge variant="light" color="gray">Отключён</Badge>}
            </Group>
            <Text size="sm" c="dimmed">Клики сегодня: {stream.clicks_today ?? 'нет данных'}</Text>
          </Stack>
          {stream.editable && !adding && (
            <Button variant="light" size="compact-sm" disabled={busy} onClick={() => setAdding(true)}>
              Добавить оффер
            </Button>
          )}
        </Group>
        {adding && (
          <Group align="end">
            <Box flex={1} miw={200}>
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
          <Text size="sm" c="dimmed">В потоке нет офферов.</Text>
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
                  <Table.Tr key={offer.id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>{offer.name}</Text>
                      <Text size="xs" c="dimmed">#{offer.id}</Text>
                      {offer.external_removal && (
                        <Text size="xs" c="orange.8">Добавлен в Keitaro, будет удалён при публикации</Text>
                      )}
                      {offer.state === 'removed' && !offer.external_removal && (
                        <Text size="xs" c="dimmed">Удалён из потока</Text>
                      )}
                      {offer.state === 'disabled' && <Text size="xs" c="dimmed">Отключён</Text>}
                    </Table.Td>
                    <Table.Td>{offer.published_share === null ? '—' : `${offer.published_share}%`}</Table.Td>
                    <Table.Td>
                      {stream.editable && offer.state === 'active' ? (
                        <ShareInput
                          key={offer.share}
                          offer={offer}
                          disabled={busy}
                          onSave={(share) => void edit(offer.id, 'pin', share)}
                        />
                      ) : `${offer.share}%`}
                    </Table.Td>
                    <Table.Td>
                      {stream.editable && (
                        <Group gap={4}>
                          {offer.state === 'removed' ? (
                            <Button
                              variant="subtle"
                              size="compact-sm"
                              disabled={busy}
                              onClick={() => void edit(offer.id, 'restore')}
                            >
                              {offer.external_removal ? 'Оставить в черновике' : 'Вернуть'}
                            </Button>
                          ) : (
                            <>
                              {offer.state === 'active' && (
                                <Button
                                  variant={offer.pinned ? 'light' : 'subtle'}
                                  size="compact-sm"
                                  disabled={busy}
                                  onClick={() => void edit(offer.id, offer.pinned ? 'unpin' : 'pin')}
                                >
                                  {offer.pinned ? 'Открепить' : 'Закрепить'}
                                </Button>
                              )}
                              <Button
                                variant="subtle"
                                color="red"
                                size="compact-sm"
                                disabled={busy}
                                onClick={() => void edit(offer.id, 'remove')}
                              >
                                Удалить
                              </Button>
                            </>
                          )}
                        </Group>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>
    </Paper>
  );
}
