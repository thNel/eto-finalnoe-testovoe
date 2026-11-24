export interface ExternalChangeDialogProps {
  opened: boolean;
  publicationRequested: boolean;
  busy: boolean;
  error: string | null;
  adminUrl?: string;
  onClose: () => void;
  onDiscard?: () => void;
  onConfirm?: () => void;
}
