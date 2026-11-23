import { request } from './http';

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

export interface CampaignInput {
  name: string;
  geo: string[];
  offer_id: number;
}

export function listCampaigns(offset: number, limit: number, signal: AbortSignal) {
  return request<CampaignPage>(`/campaigns?offset=${offset}&limit=${limit}`, { signal });
}

export function createCampaign(input: CampaignInput) {
  return request<CreatedCampaign>('/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
