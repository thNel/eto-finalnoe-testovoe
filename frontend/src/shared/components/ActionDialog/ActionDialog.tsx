import { Modal } from '@mantine/core';

import { useVisualViewport } from '@/shared/hooks/useVisualViewport';
import styles from './ActionDialog.module.css';
import type { ActionDialogProps } from './ActionDialog.types';

export function ActionDialog({ title, opened = true, busy = false, onClose, children }: ActionDialogProps) {
  const viewport = useVisualViewport(opened);

  return (
    <Modal
      title={title}
      opened={opened}
      onClose={onClose}
      classNames={{ inner: styles.inner, content: styles.content, header: styles.header }}
      style={viewport && {
        '--action-dialog-viewport-height': `${viewport.height}px`,
        '--action-dialog-viewport-top': `${viewport.offsetTop}px`,
      }}
      onClick={(event) => {
        if (opened && !busy && event.target instanceof HTMLElement && event.target.classList.contains(styles.inner)) {
          onClose();
        }
      }}
      closeOnClickOutside={!busy}
      closeOnEscape={!busy}
      withCloseButton={!busy}
    >
      {children}
    </Modal>
  );
}
