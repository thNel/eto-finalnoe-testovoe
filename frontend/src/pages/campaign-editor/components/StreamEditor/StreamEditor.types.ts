import type { EditorStream, OfferEdit } from '../../../../shared/api/campaign-editor/campaign-editor.dto';

export interface StreamEditorProps {
  stream: EditorStream;
  busy: boolean;
  onEdit: (edit: OfferEdit) => Promise<boolean>;
}
