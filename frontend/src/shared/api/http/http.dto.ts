export interface ApiErrorDetail {
  message: string;
  code?: string;
  remote_revision?: string;
  step?: string;
  campaign_id?: number;
  campaign_state?: string;
  alias?: string;
  admin_url?: string;
}
