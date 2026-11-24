import { Button, Group, Stack, Text } from '@mantine/core';
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';

import { ActionDialog } from '../../../../shared/components/ActionDialog/ActionDialog';
import styles from './ExternalChangeDialog.module.css';
import type { ExternalChangeDialogProps } from './ExternalChangeDialog.types';

export function ExternalChangeDialog({
  opened, publicationRequested, busy, error, adminUrl, onClose, onDiscard, onConfirm,
}: ExternalChangeDialogProps) {
  return (
    <ActionDialog opened={opened} busy={busy} title="Кампания изменилась в Keitaro" onClose={onClose}>
      <Stack>
        <Text size="sm">
          Проверьте текущие настройки в Keitaro. Публикация перезапишет офферы и доли в изменённых потоках.
        </Text>
        {error && <Text size="sm" className={styles.error}>{error}</Text>}
        <Group className={styles.compact}>
          {adminUrl && (
            <Button
              component="a"
              href={adminUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              color="teal"
              leftSection={<ArrowSquareOutIcon size={18} aria-hidden="true" />}
            >
              Открыть в Keitaro
            </Button>
          )}
          {!publicationRequested && (
            <Button variant="default" disabled={busy} onClick={onClose}>Продолжить редактирование</Button>
          )}
          {!publicationRequested && onDiscard && (
            <Button variant="subtle" color="red" disabled={busy} onClick={onDiscard}>
              Отменить редактирование
            </Button>
          )}
          {onConfirm && (
            <Button color="orange" disabled={busy} onClick={onConfirm} className={styles.selfRight}>Подтвердить перезапись</Button>
          )}
        </Group>
      </Stack>
    </ActionDialog>
  );
}
