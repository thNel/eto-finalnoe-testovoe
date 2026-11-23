import { Alert, Anchor, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { type FormEvent, useState } from 'react';

import { type CreatedCampaign, createCampaign } from '../../../shared/api/campaigns';
import { ApiError, type ApiErrorDetail } from '../../../shared/api/http';
import { type Offer } from '../../../shared/api/offers';
import { OfferSelect } from '../../../shared/components/OfferSelect';

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

export function CampaignForm({ onClose, onCreated }: CampaignFormProps) {
  const [name, setName] = useState('');
  const [geo, setGeo] = useState('');
  const [selected, setSelected] = useState<Offer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiErrorDetail | null>(null);

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
          <OfferSelect value={selected} onChange={setSelected} disabled={submitting} />
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
