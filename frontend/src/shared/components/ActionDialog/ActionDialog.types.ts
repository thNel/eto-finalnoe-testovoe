import type { ReactNode } from 'react';

export interface ActionDialogProps {
  title: string;
  opened?: boolean;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}
