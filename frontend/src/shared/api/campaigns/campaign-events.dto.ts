export interface CampaignRevisionEvent {
  type: 'campaign_revision';
  campaign_id: number;
  remote_revision: string | null;
}

export interface CampaignListRevisionEvent {
  type: 'campaign_list_revision';
  remote_revision: string;
}
