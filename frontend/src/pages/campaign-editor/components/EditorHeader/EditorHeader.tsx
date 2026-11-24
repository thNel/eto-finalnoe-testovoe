import {ActionIcon, Badge, Box, Button, Group, Stack, Title} from '@mantine/core';
import {ArrowLeftIcon} from '@phosphor-icons/react/dist/csr/ArrowLeft';
import {Link} from 'react-router';

import {BreakableText} from '@/shared/components/BreakableText/BreakableText';
import {ArrowSquareOutIcon} from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
import {useLightOrDefaultVariant} from '@/shared/hooks/useLightOrDefaultVariant';
import styles from './EditorHeader.module.css';
import type {EditorHeaderProps} from './EditorHeader.types';
import {ArrowCounterClockwiseIcon} from "@phosphor-icons/react/ArrowCounterClockwise";

export function EditorHeader({campaign, hasDraft, busy, onRefresh, onDiscard, onPublish}: EditorHeaderProps) {
  const variant = useLightOrDefaultVariant();

  return (
    <Group className={styles.root}>
      <Box className={styles.heading}>
        <Stack>
          <Group className={styles.title}>
            <ActionIcon
              component={Link}
              to="/"
              variant="default"
              size="lg"
              aria-label="Все кампании"
              title="Назад к списку кампаний"
            >
              <ArrowLeftIcon size={18} aria-hidden="true"/>
            </ActionIcon>
            <Title order={1}>
              <BreakableText>{campaign?.name ?? 'Редактор кампании'}</BreakableText>
            </Title>
            {hasDraft && <Badge color="yellow">Черновик</Badge>}
          </Group>
          {hasDraft && (
            <Group className={styles.compact}>
              <Button variant={variant} color="#bb2124" disabled={busy} onClick={onDiscard}>Отменить изменения</Button>
              <Button disabled={busy} onClick={onPublish}>Опубликовать</Button>
            </Group>
          )}
        </Stack>
      </Box>
      <Group className={styles.compact}>
        <Button variant="default" disabled={busy} onClick={onRefresh}
                leftSection={<ArrowCounterClockwiseIcon size={18} aria-hidden="true"/>}>
          Обновить
        </Button>
        {campaign &&
          <Button component="a" href={campaign.admin_url} target="_blank" rel="noopener noreferrer" variant="subtle"
                  color="teal" leftSection={<ArrowSquareOutIcon size={18} aria-hidden="true"/>}>
            Открыть в Keitaro
          </Button>
        }
      </Group>
    </Group>
  );
}
