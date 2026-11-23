import { type Campaign } from './campaigns';
import { request } from './http';
import { type Offer } from './offers';

export interface EditorOffer extends Offer {
  published_share: number | null;
  share: number;
  state: string;
  pinned: boolean;
  external_removal: boolean;
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

export function readEditor(id: number, signal?: AbortSignal) {
  return request<CampaignEditor>(`/campaigns/${id}`, { signal });
}

export function editDraft(id: number, version: number, edit: OfferEdit) {
  return request<CampaignEditor>(`/campaigns/${id}/draft`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...edit, version }),
  });
}

export function discardDraft(id: number, version: number) {
  return request<CampaignEditor>(`/campaigns/${id}/draft?version=${version}`, { method: 'DELETE' });
}

export function publishDraft(id: number, version: number, confirmRevision?: string) {
  return request<CampaignEditor>(`/campaigns/${id}/publications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, confirm_revision: confirmRevision }),
  });
}
