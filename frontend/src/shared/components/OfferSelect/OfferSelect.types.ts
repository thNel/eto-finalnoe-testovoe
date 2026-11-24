import type { Offer } from '@/shared/api/offers/offers.dto';

export interface OfferSelectProps {
  value: Offer | null;
  onChange: (offer: Offer | null) => void;
  disabled?: boolean;
  excludedIds?: readonly number[];
}
