import { Button, Group, Table, Text } from '@mantine/core';
import cn from "classnames";

import { ShareInput } from '../ShareInput/ShareInput';
import styles from './StreamOfferRow.module.css';
import type { StreamOfferRowProps } from './StreamOfferRow.types';

export function StreamOfferRow({ offer, editable, busy, onEdit }: StreamOfferRowProps) {
  const noteClassName = cn({
    [styles.caption]: true,
    [styles.warning]: offer.external_removal,
    [styles.muted]: !offer.external_removal,
  });
  const removed = offer.state === 'removed';
  const active = offer.state === 'active';

  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" className={styles.name}>{offer.name}</Text>
        <Text className={cn(styles.caption, styles.muted)}>#{offer.id}</Text>
        {offer.external_removal && (
          <Text className={noteClassName}>Добавлен в Keitaro, будет удалён при публикации</Text>
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
                size="compact-sm"
                disabled={busy}
                onClick={() => void onEdit(offer.id, 'restore')}
              >
                {offer.external_removal ? 'Оставить в черновике' : 'Вернуть'}
              </Button>
            ) : (
              <>
                {active && (
                  <Button
                    variant={offer.pinned ? 'light' : 'subtle'}
                    size="compact-sm"
                    disabled={busy}
                    onClick={() => void onEdit(offer.id, offer.pinned ? 'unpin' : 'pin')}
                  >
                    {offer.pinned ? 'Открепить' : 'Закрепить'}
                  </Button>
                )}
                <Button
                  variant="subtle"
                  color="red"
                  size="compact-sm"
                  disabled={busy}
                  onClick={() => void onEdit(offer.id, 'remove')}
                >
                  Удалить
                </Button>
              </>
            )}
          </Group>
        )}
      </Table.Td>
    </Table.Tr>
  );
}
