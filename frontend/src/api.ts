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
