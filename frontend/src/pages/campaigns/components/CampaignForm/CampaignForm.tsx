import { Button, Group, Stack, TextInput } from '@mantine/core';

import { ActionDialog } from '@/shared/components/ActionDialog/ActionDialog';
import { OfferSelect } from '@/shared/components/OfferSelect/OfferSelect';
import styles from './CampaignForm.module.css';
import type { CampaignFormProps } from './CampaignForm.types';
import { CreationError } from './components/CreationError/CreationError';
import { useCampaignForm } from './hooks/useCampaignForm';

export function CampaignForm({ onClose, onCreated }: CampaignFormProps) {
  const { name, setName, geo, setGeo, selected, setSelected, submitting, error, submit } = useCampaignForm(onCreated);

  return (
    <ActionDialog title="Новая кампания" busy={submitting} onClose={onClose}>
      <form onSubmit={submit}>
        <Stack>
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
          {error && <CreationError error={error} />}
          <Group className={styles.actions}>
            <Button type="button" variant="default" disabled={submitting} onClick={onClose}>Отмена</Button>
            <Button type="submit" loading={submitting} disabled={!selected}>Создать кампанию</Button>
          </Group>
        </Stack>
      </form>
    </ActionDialog>
  );
}
