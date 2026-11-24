import type { EditorOffer, OfferEdit } from '@/shared/api/campaign-editor/campaign-editor.dto';

export interface StreamOfferRowProps {
  offer: EditorOffer;
  editable: boolean;
  busy: boolean;
  onEdit: (offerId: number, operation: OfferEdit['operation'], share?: number) => Promise<boolean>;
}
