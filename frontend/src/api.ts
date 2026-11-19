export interface Campaign {
  id: number;
  name: string;
  state: string;
  admin_url: string;
}

export interface CampaignPage {
  items: Campaign[];
  has_more: boolean;
}

export interface CreatedCampaign extends Campaign {
  tracking_url: string;
}

export interface Offer {
  id: number;
  name: string;
}

export interface CampaignInput {
  name: string;
  geo: string[];
  offer_id: number;
}

export interface ApiErrorDetail {
  message: string;
  code?: string;
  remote_revision?: string;
  step?: string;
  campaign_id?: number;
  campaign_state?: string;
  alias?: string;
  admin_url?: string;
}

export class ApiError extends Error {
  constructor(public readonly detail: ApiErrorDetail) {
    super(detail.message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, init);
  if (response.ok) return response.json();

  const body = await response.json().catch(() => null);
  const detail = body?.detail;
  if (typeof detail?.message === 'string') throw new ApiError(detail);
  if (Array.isArray(detail)) {
    const geoError = detail.find((item) => item.loc?.includes('geo') && typeof item.msg === 'string');
    const message = geoError?.msg.replace(/^Value error, /, '') ?? 'Проверьте название, GEO и оффер.';
    throw new ApiError({ message });
  }
  throw new ApiError({ message: `API вернул ошибку HTTP ${response.status}.` });
}

export function listCampaigns(offset: number, limit: number, signal: AbortSignal) {
  return request<CampaignPage>(`/campaigns?offset=${offset}&limit=${limit}`, { signal });
}

export function searchOffers(query: string, signal: AbortSignal) {
  return request<Offer[]>(`/offers?q=${encodeURIComponent(query)}`, { signal });
}

export function createCampaign(input: CampaignInput) {
  return request<CreatedCampaign>('/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

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
