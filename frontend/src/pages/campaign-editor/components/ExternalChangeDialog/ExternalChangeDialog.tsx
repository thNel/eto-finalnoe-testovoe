import {Button, Group, Stack, Text} from '@mantine/core';
import {ArrowSquareOutIcon} from '@phosphor-icons/react/dist/csr/ArrowSquareOut';

import {ActionDialog} from '@/shared/components/ActionDialog/ActionDialog';
import styles from './ExternalChangeDialog.module.css';
import type {ExternalChangeDialogProps} from './ExternalChangeDialog.types';
import {useLightOrDefaultVariant} from "@/shared/hooks/useLightOrDefaultVariant";

export function ExternalChangeDialog({
                                       opened, publicationRequested, busy, error, adminUrl, onClose, onDiscard, onConfirm,
                                     }: ExternalChangeDialogProps) {
  const variant = useLightOrDefaultVariant();

  return (
    <ActionDialog opened={opened} busy={busy} title="Кампания изменилась в Keitaro" onClose={onClose}>
      <Stack>
        <Group>
          {adminUrl && (
            <Button
              component="a"
              href={adminUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              color="teal"
              leftSection={<ArrowSquareOutIcon size={18} aria-hidden="true"/>}
            >
              Открыть в Keitaro
            </Button>
          )}
        </Group>
        <Text size="sm">
          Проверьте текущие настройки в Keitaro. Публикация перезапишет офферы и доли в изменённых потоках.
        </Text>
        {error && <Text size="sm" className={styles.error}>{error}</Text>}
        <Group className={styles.opposite}>
          {!publicationRequested && onDiscard && (
            <Button variant={variant} color="red" disabled={busy} onClick={onDiscard}>
              Отменить редактирование
            </Button>
          )}
          {!publicationRequested && (
            <Button variant={variant} disabled={busy} onClick={onClose}>Продолжить</Button>
          )}
          {onConfirm && (
            <Button color="orange" disabled={busy} onClick={onConfirm} className={styles.selfRight}>Подтвердить перезапись</Button>
          )}
        </Group>
      </Stack>
    </ActionDialog>
  );
}
