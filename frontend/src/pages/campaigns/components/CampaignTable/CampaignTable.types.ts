import type { CampaignPage } from '../../../../shared/api/campaigns/campaigns.dto';

export interface CampaignTableProps {
  data: CampaignPage;
  page: number;
  knownPageCount: number;
  onPageChange: (page: number) => void;
}
