import { Box, Button, Group } from '@mantine/core';
import { useState } from 'react';

import type { Offer } from '@/shared/api/offers/offers.dto';
import { OfferSelect } from '@/shared/components/OfferSelect/OfferSelect';
import styles from './StreamOfferPicker.module.css';
import type { StreamOfferPickerProps } from './StreamOfferPicker.types';

export function StreamOfferPicker({ busy, excludedIds, onAdd, onClose }: StreamOfferPickerProps) {
  const [selected, setSelected] = useState<Offer | null>(null);

  async function add() {
    if (selected && await onAdd(selected.id)) onClose();
  }

  return (
    <Group className={styles.root}>
      <Box className={styles.offerSelect}>
        <OfferSelect value={selected} onChange={setSelected} disabled={busy} excludedIds={excludedIds} />
      </Box>
      <Button size="sm" disabled={busy || !selected} onClick={() => void add()}>Добавить</Button>
      <Button variant="default" size="sm" disabled={busy} onClick={onClose}>Отмена</Button>
    </Group>
  );
}
