import { Button, Group, Loader, Select, Stack, Text } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useEffect, useState } from 'react';

import { type Offer, searchOffers } from '../api/offers';

interface OfferSelectProps {
  value: Offer | null;
  onChange: (offer: Offer | null) => void;
  disabled?: boolean;
  excludedIds?: readonly number[];
}

export function OfferSelect({ value, onChange, disabled, excludedIds }: OfferSelectProps) {
  const [search, setSearch] = useState('');
  const searchTerm = search.trim().slice(0, 200);
  const [query] = useDebouncedValue(searchTerm, 250);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    searchOffers(query, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setOffers(result); })
      .catch(() => {
        if (!controller.signal.aborted) {
          setOffers([]);
          setFailed(true);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, attempt]);

  const visible = offers.filter((offer) => !excludedIds?.includes(offer.id));
  if (value && !visible.some((offer) => offer.id === value.id)) visible.push(value);
  const searching = loading || query !== searchTerm;

  return (
    <Stack gap={4}>
      <Select
        label="Оффер"
        placeholder="Поиск по названию или ID"
        searchable
        clearable
        withAsterisk
        disabled={disabled}
        data={visible.map((offer) => ({ value: String(offer.id), label: `${offer.name} · #${offer.id}` }))}
        value={value ? String(value.id) : null}
        onSearchChange={setSearch}
        onChange={(id) => onChange(visible.find((offer) => String(offer.id) === id) ?? null)}
        nothingFoundMessage={searching ? 'Загрузка…' : 'Офферы не найдены'}
        rightSection={searching && !value ? <Loader size="xs" /> : undefined}
      />
      {failed && (
        <Group gap="xs">
          <Text size="sm" c="red">Не удалось загрузить офферы.</Text>
          <Button type="button" size="compact-xs" variant="subtle" onClick={() => setAttempt((value) => value + 1)}>
            Повторить
          </Button>
        </Group>
      )}
    </Stack>
  );
}
