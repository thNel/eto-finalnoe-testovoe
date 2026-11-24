import type { CampaignPage } from '@/shared/api/campaigns/campaigns.dto';

export type ListState =
  | { status: 'loading' }
  | { status: 'ready'; data: CampaignPage }
  | { status: 'error'; message: string };
