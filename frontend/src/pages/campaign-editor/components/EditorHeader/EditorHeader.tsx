import { ActionIcon, Badge, Box, Button, Group, Stack, Title } from '@mantine/core';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { Link } from 'react-router';

import { BreakableText } from '../../../../shared/components/BreakableText/BreakableText';
import { ExternalLink } from '../../../../shared/components/ExternalLink/ExternalLink';
import { useLightOrDefaultVariant } from '../../../../shared/hooks/useLightOrDefaultVariant';
import styles from './EditorHeader.module.css';
import type { EditorHeaderProps } from './EditorHeader.types';

export function EditorHeader({ campaign, hasDraft, busy, onRefresh, onDiscard, onPublish }: EditorHeaderProps) {
  const variant = useLightOrDefaultVariant();

  return (
    <Group className={styles.root}>
      <Box className={styles.heading}>
        <ActionIcon
          component={Link}
          to="/"
          variant="default"
          size="lg"
          aria-label="Все кампании"
          title="Назад к списку кампаний"
        >
          <ArrowLeftIcon size={18} aria-hidden="true" />
        </ActionIcon>
        <Stack className={styles.compact}>
          <Group className={styles.title}>
            <Title order={1}>
              <BreakableText>{campaign?.name ?? 'Редактор кампании'}</BreakableText>
            </Title>
            {hasDraft && <Badge color="yellow">Черновик</Badge>}
          </Group>
          {campaign && <ExternalLink href={campaign.admin_url} compact>Открыть в Keitaro</ExternalLink>}
        </Stack>
      </Box>
      <Group className={styles.compact}>
        <Button variant="default" disabled={busy} onClick={onRefresh}>Обновить</Button>
        {hasDraft && (
          <>
            <Button variant={variant} disabled={busy} onClick={onDiscard}>Отменить изменения</Button>
            <Button disabled={busy} onClick={onPublish}>Опубликовать</Button>
          </>
        )}
      </Group>
    </Group>
  );
}
