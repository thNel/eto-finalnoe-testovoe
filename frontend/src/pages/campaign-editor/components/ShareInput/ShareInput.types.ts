import type { EditorOffer } from '@/shared/api/campaign-editor/campaign-editor.dto';

export interface ShareInputProps {
  offer: EditorOffer;
  disabled: boolean;
  onSave: (share: number) => void;
}
