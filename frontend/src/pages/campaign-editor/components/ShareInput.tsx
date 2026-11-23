import { NumberInput } from '@mantine/core';
import { useState } from 'react';

import styles from './ShareInput.module.css';
import type { ShareInputProps } from './ShareInput.types';

export function ShareInput({ offer, disabled, onSave }: ShareInputProps) {
  const [value, setValue] = useState<string | number>(offer.share);

  return (
    <NumberInput
      aria-label={`Доля оффера ${offer.name}`}
      className={styles.root}
      value={value}
      onChange={setValue}
      onBlur={() => {
        setValue(offer.share);
        if (typeof value === 'number' && value !== offer.share) onSave(value);
      }}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      disabled={disabled}
      min={0}
      max={100}
      allowDecimal={false}
      hideControls
      size="xs"
    />
  );
}
