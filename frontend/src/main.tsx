import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { CampaignEditorPage } from './CampaignEditorPage';
import { CampaignsPage } from './CampaignsPage';

const editorPath = /^\/campaigns\/([1-9]\d*)\/?$/.exec(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider>
      {editorPath ? <CampaignEditorPage id={Number(editorPath[1])} /> : <CampaignsPage />}
    </MantineProvider>
  </StrictMode>,
);
