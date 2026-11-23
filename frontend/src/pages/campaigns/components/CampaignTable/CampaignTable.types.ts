import type { CampaignPage } from '../../../../shared/api/campaigns/campaigns.dto';

export interface CampaignTableProps {
  data: CampaignPage;
  page: number;
  onPageChange: (page: number) => void;
}
