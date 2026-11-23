export interface CampaignEditorPageProps {
  id: number;
}

export interface RefreshRequest {
  revision: string | null;
  force: boolean;
}
