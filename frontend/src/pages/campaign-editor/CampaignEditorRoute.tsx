import { Navigate, useParams } from 'react-router';

import { CampaignEditorPage } from './CampaignEditorPage';

export function CampaignEditorRoute() {
  const { campaignId } = useParams<'campaignId'>();
  const id = Number(campaignId);

  if (!Number.isSafeInteger(id) || id <= 0 || String(id) !== campaignId) {
    return <Navigate to="/" replace />;
  }

  return <CampaignEditorPage key={id} id={id} />;
}
