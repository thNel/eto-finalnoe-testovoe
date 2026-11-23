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
