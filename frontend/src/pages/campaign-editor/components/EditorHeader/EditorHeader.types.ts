import type { Campaign } from '../../../../shared/api/campaigns/campaigns.dto';

export interface EditorHeaderProps {
  campaign?: Campaign;
  hasDraft: boolean;
  busy: boolean;
  onRefresh: () => void;
  onStateChange: (enabled: boolean) => void;
  onDiscard: () => void;
  onPublish: () => void;
}
