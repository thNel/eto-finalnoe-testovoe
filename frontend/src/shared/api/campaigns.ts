import type { CampaignInput, CampaignPage, CreatedCampaign } from './campaigns.dto';
import { request } from './http';

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
