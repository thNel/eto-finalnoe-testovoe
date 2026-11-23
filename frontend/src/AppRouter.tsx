import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { CampaignEditorRoute } from './pages/campaign-editor/CampaignEditorRoute';
import { CampaignsPage } from './pages/campaigns/CampaignsPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CampaignsPage />} />
        <Route path="/campaigns/:campaignId" element={<CampaignEditorRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
