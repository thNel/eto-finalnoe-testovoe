import { Modal } from '@mantine/core';

import type { ActionDialogProps } from './ActionDialog.types';

export function ActionDialog({ title, opened = true, busy = false, onClose, children }: ActionDialogProps) {
  return (
    <Modal
      title={title}
      opened={opened}
      onClose={onClose}
      centered
      closeOnClickOutside={!busy}
      closeOnEscape={!busy}
      withCloseButton={!busy}
    >
      {children}
    </Modal>
  );
}
