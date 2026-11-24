import type { CreatedCampaign } from '@/shared/api/campaigns/campaigns.dto';

export interface CampaignFormProps {
  onClose: () => void;
  onCreated: (campaign: CreatedCampaign) => void;
}
