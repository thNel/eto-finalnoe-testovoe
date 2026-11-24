import { ActionIcon, Button, Group, Table, Text } from '@mantine/core';
import { PushPinIcon } from '@phosphor-icons/react/dist/csr/PushPin';
import { PushPinSlashIcon } from '@phosphor-icons/react/dist/csr/PushPinSlash';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import cn from "classnames";

import { useLightOrDefaultVariant } from '@/shared/hooks/useLightOrDefaultVariant';
import { ShareInput } from '../ShareInput/ShareInput';
import styles from './StreamOfferRow.module.css';
import type { StreamOfferRowProps } from './StreamOfferRow.types';

export function StreamOfferRow({ offer, editable, busy, onEdit }: StreamOfferRowProps) {
  const variant = useLightOrDefaultVariant();
  const noteClassName = cn({
    [styles.caption]: true,
    [styles.warning]: offer.external_removal || offer.removed_in_keitaro,
    [styles.muted]: !offer.external_removal && !offer.removed_in_keitaro,
  });
  const removed = offer.state === 'removed';
  const active = offer.state === 'active';
  const pinLabel = offer.pinned ? 'Открепить' : 'Закрепить';
  const PinIcon = offer.pinned ? PushPinSlashIcon : PushPinIcon;

  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" className={styles.name}>{offer.name}</Text>
        <Text className={cn(styles.caption, styles.muted)}>#{offer.id}</Text>
        {offer.external_removal && (
          <Text className={noteClassName}>Добавлен в Keitaro, будет удалён при публикации</Text>
        )}
        {offer.removed_in_keitaro && (
          <Text className={noteClassName}>Удалён в Keitaro, сохранён в черновике</Text>
        )}
        {removed && !offer.external_removal && <Text className={noteClassName}>Удалён из потока</Text>}
        {offer.state === 'disabled' && <Text className={cn(styles.caption, styles.muted)}>Отключён</Text>}
      </Table.Td>
      <Table.Td>{offer.published_share === null ? '—' : `${offer.published_share}%`}</Table.Td>
      <Table.Td>
        {editable && active ? (
          <ShareInput
            key={offer.share}
            offer={offer}
            disabled={busy}
            onSave={(share) => void onEdit(offer.id, 'pin', share)}
          />
        ) : `${offer.share}%`}
      </Table.Td>
      <Table.Td>
        {editable && (
          <Group className={styles.actions}>
            {removed ? (
              <Button
                variant="subtle"
                size="sm"
                disabled={busy}
                onClick={() => void onEdit(offer.id, 'restore')}
              >
                {offer.external_removal ? 'Оставить в черновике' : 'Вернуть'}
              </Button>
            ) : (
              <>
                {active && (
                  <ActionIcon
                    variant={offer.pinned ? variant : 'subtle'}
                    size="lg"
                    aria-label={pinLabel}
                    title={pinLabel}
                    disabled={busy}
                    onClick={() => void onEdit(offer.id, offer.pinned ? 'unpin' : 'pin')}
                  >
                    <PinIcon size={18} aria-hidden="true" />
                  </ActionIcon>
                )}
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="lg"
                  aria-label="Удалить"
                  title="Удалить"
                  disabled={busy}
                  onClick={() => void onEdit(offer.id, 'remove')}
                >
                  <TrashIcon size={18} aria-hidden="true" />
                </ActionIcon>
              </>
            )}
          </Group>
        )}
      </Table.Td>
    </Table.Tr>
  );
}
