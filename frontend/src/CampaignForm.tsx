import { Alert, Anchor, Button, Group, Loader, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { type FormEvent, useEffect, useState } from 'react';

import { ApiError, type ApiErrorDetail, type CreatedCampaign, type Offer, createCampaign, searchOffers } from './api';

interface CampaignFormProps {
  onClose: () => void;
  onCreated: (campaign: CreatedCampaign) => void;
}

const stepNames: Record<string, string> = {
  validate: 'Проверка настроек',
  campaign: 'Создание кампании',
  geo_stream: 'Настройка GEO-потока',
  offer_stream: 'Настройка потока с оффером',
  verify: 'Проверка настроек в Keitaro',
  enable: 'Включение кампании',
};

function offerOption(offer: Offer) {
  return { value: String(offer.id), label: `${offer.name} · #${offer.id}` };
}

export function CampaignForm({ onClose, onCreated }: CampaignFormProps) {
  const [name, setName] = useState('');
  const [geo, setGeo] = useState('');
  const [search, setSearch] = useState('');
  const searchTerm = search.trim().slice(0, 200);
  const [query] = useDebouncedValue(searchTerm, 250);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selected, setSelected] = useState<Offer | null>(null);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState(false);
  const [offersRequest, setOffersRequest] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiErrorDetail | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setOffersLoading(true);
    setOffersError(false);
    searchOffers(query, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setOffers(result); })
      .catch(() => {
        if (!controller.signal.aborted) {
          setOffers([]);
          setOffersError(true);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setOffersLoading(false); });
    return () => controller.abort();
  }, [query, offersRequest]);

  const visibleOffers = selected && !offers.some((offer) => offer.id === selected.id)
    ? [...offers, selected]
    : offers;
  const searching = offersLoading || query !== searchTerm;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !selected) return;

    const codes = geo.trim().toUpperCase().split(/[\s,]+/).filter(Boolean);
    if (!name.trim() || !codes.length || codes.some((code) => !/^[A-Z]{2}$/.test(code))) {
      setError({ message: 'Укажите название кампании и GEO двухбуквенными кодами, например PL, AU.' });
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      onCreated(await createCampaign({ name: name.trim(), geo: codes, offer_id: selected.id }));
    } catch (failure) {
      setError(failure instanceof ApiError
        ? failure.detail
        : { message: 'Связь с API прервалась. Обновите список кампаний перед повторной попыткой.' });
      setSubmitting(false);
    }
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title="Новая кампания"
      closeOnClickOutside={!submitting}
      closeOnEscape={!submitting}
      withCloseButton={!submitting}
      centered
    >
      <form onSubmit={submit}>
        <Stack gap="md">
          <TextInput
            label="Название"
            placeholder="Название кампании"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            maxLength={200}
            required
            disabled={submitting}
            data-autofocus
          />
          <TextInput
            label="GEO"
            placeholder="PL, AU"
            description="Перечислите коды стран через пробел или запятую"
            value={geo}
            onChange={(event) => setGeo(event.currentTarget.value)}
            required
            disabled={submitting}
          />
          <Select
            label="Оффер"
            placeholder="Поиск по названию или ID"
            searchable
            clearable
            withAsterisk
            disabled={submitting}
            data={visibleOffers.map(offerOption)}
            value={selected ? String(selected.id) : null}
            onSearchChange={setSearch}
            onChange={(value) => setSelected(visibleOffers.find((offer) => String(offer.id) === value) ?? null)}
            nothingFoundMessage={searching ? 'Загрузка…' : 'Офферы не найдены'}
            rightSection={searching && !selected ? <Loader size="xs" /> : undefined}
          />
          {offersError && (
            <Group gap="xs">
              <Text size="sm" c="red">Не удалось загрузить офферы.</Text>
              <Button type="button" size="compact-xs" variant="subtle" onClick={() => setOffersRequest((value) => value + 1)}>
                Повторить
              </Button>
            </Group>
          )}
          {error && (
            <Alert color="red" title={error.step ? stepNames[error.step] : 'Не удалось создать кампанию'} role="alert">
              {error.message}
              {error.campaign_id && (
                <Text size="sm" mt={4}>
                  <Anchor href={error.admin_url} target="_blank" rel="noopener noreferrer">
                    Кампания №{error.campaign_id}
                  </Anchor>
                  {error.campaign_state === 'disabled' && ' отключена.'}
                  {error.campaign_state === 'unknown' && ' — статус не подтверждён.'}
                </Text>
              )}
              {!error.campaign_id && error.alias && (
                <Text size="sm" mt={4}>Проверьте в Keitaro, появилась ли кампания с идентификатором {error.alias}.</Text>
              )}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button type="button" variant="default" disabled={submitting} onClick={onClose}>Отмена</Button>
            <Button type="submit" loading={submitting} disabled={!selected}>Создать кампанию</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
