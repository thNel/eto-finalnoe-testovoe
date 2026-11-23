export interface CampaignRevisionEvent {
  type: 'campaign_revision';
  campaign_id: number;
  remote_revision: string | null;
}
