import type { Campaign } from '../campaigns/campaigns.dto';
import type { Offer } from '../offers/offers.dto';

export interface EditorOffer extends Offer {
  published_share: number | null;
  share: number;
  state: string;
  pinned: boolean;
  external_removal: boolean;
  removed_in_keitaro: boolean;
}

export interface EditorStream {
  id: number;
  name: string;
  state: string;
  editable: boolean;
  edited: boolean;
  clicks_today: number | null;
  offers: EditorOffer[];
}

export interface CampaignEditor {
  campaign: Campaign;
  mode: 'published' | 'draft';
  version: number;
  remote_revision: string;
  external_changed: boolean;
  streams: EditorStream[];
}

export interface OfferEdit {
  stream_id: number;
  offer_id: number;
  operation: 'add' | 'remove' | 'restore' | 'pin' | 'unpin';
  share?: number;
}

export interface EditDraftRequest extends OfferEdit {
  version: number;
}

export interface PublishDraftRequest {
  version: number;
  confirm_revision?: string;
}

export interface CampaignStatusRequest {
  state: 'active' | 'disabled';
}
