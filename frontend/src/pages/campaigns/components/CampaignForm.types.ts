import type { CreatedCampaign } from '../../../shared/api/campaigns.dto';

export interface CampaignFormProps {
  onClose: () => void;
  onCreated: (campaign: CreatedCampaign) => void;
}
