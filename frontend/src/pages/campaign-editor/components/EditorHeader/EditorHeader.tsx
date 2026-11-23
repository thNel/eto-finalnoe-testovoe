import { Badge, Button, Group, Stack, Title } from '@mantine/core';

import { ExternalLink } from '../../../../shared/components/ExternalLink/ExternalLink';
import styles from './EditorHeader.module.css';
import type { EditorHeaderProps } from './EditorHeader.types';

export function EditorHeader({ campaign, hasDraft, busy, onRefresh, onDiscard, onPublish }: EditorHeaderProps) {
  return (
    <Group className={styles.root}>
      <Stack className={styles.compact}>
        <Group className={styles.title}>
          <Title order={1}>{campaign?.name ?? 'Редактор кампании'}</Title>
          {hasDraft && <Badge color="yellow">Черновик</Badge>}
        </Group>
        {campaign && <ExternalLink href={campaign.admin_url} compact>Открыть в Keitaro</ExternalLink>}
      </Stack>
      <Group className={styles.compact}>
        <Button variant="default" disabled={busy} onClick={onRefresh}>Обновить</Button>
        {hasDraft && (
          <>
            <Button variant="default" disabled={busy} onClick={onDiscard}>Отменить изменения</Button>
            <Button disabled={busy} onClick={onPublish}>Опубликовать</Button>
          </>
        )}
      </Group>
    </Group>
  );
}
