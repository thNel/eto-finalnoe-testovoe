export interface StreamOfferPickerProps {
  busy: boolean;
  excludedIds: readonly number[];
  onAdd: (offerId: number) => Promise<boolean>;
  onClose: () => void;
}
