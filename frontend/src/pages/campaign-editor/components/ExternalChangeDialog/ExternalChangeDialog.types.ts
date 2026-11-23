export interface ExternalChangeDialogProps {
  opened: boolean;
  busy: boolean;
  error: string | null;
  adminUrl?: string;
  onClose: () => void;
  onConfirm?: () => void;
}
