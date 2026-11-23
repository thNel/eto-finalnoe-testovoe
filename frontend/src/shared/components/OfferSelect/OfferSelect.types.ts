import type { Offer } from '../../api/offers/offers.dto';

export interface OfferSelectProps {
  value: Offer | null;
  onChange: (offer: Offer | null) => void;
  disabled?: boolean;
  excludedIds?: readonly number[];
}
