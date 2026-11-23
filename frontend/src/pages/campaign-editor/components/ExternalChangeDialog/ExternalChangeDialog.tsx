import { Button, Group, Stack, Text } from '@mantine/core';

import { ActionDialog } from '../../../../shared/components/ActionDialog/ActionDialog';
import styles from './ExternalChangeDialog.module.css';
import type { ExternalChangeDialogProps } from './ExternalChangeDialog.types';

export function ExternalChangeDialog({ opened, busy, error, adminUrl, onClose, onConfirm }: ExternalChangeDialogProps) {
  return (
    <ActionDialog opened={opened} busy={busy} title="Кампания изменилась в Keitaro" onClose={onClose}>
      <Stack>
        <Text size="sm">
          Проверьте текущие настройки в Keitaro. Публикация перезапишет офферы и доли в изменённых потоках.
        </Text>
        {error && <Text size="sm" className={styles.error}>{error}</Text>}
        <Group className={styles.compact}>
          <Button component="a" href={adminUrl} target="_blank" rel="noopener noreferrer" variant="light">
            Открыть в Keitaro
          </Button>
          <Button variant="default" disabled={busy} onClick={onClose}>Продолжить редактирование</Button>
          {onConfirm && (
            <Button color="orange" disabled={busy} onClick={onConfirm}>Подтвердить перезапись</Button>
          )}
        </Group>
      </Stack>
    </ActionDialog>
  );
}
