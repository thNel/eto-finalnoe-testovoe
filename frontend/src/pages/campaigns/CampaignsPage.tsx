import { Alert, Button, Group, Loader, Text, Title } from '@mantine/core';
import { useState } from 'react';

import type { CreatedCampaign } from '../../shared/api/campaigns/campaigns.dto';
import { PageLayout } from '../../shared/components/PageLayout/PageLayout';
import styles from './CampaignsPage.module.css';
import { CampaignForm } from './components/CampaignForm/CampaignForm';
import { CampaignTable } from './components/CampaignTable/CampaignTable';
import { CreationNotice } from './components/CreationNotice/CreationNotice';
import { useCampaignList } from './hooks/useCampaignList';

export function CampaignsPage() {
  const { list, page, knownPageCount, loadPage } = useCampaignList();
  const [formOpen, setFormOpen] = useState(false);
  const [created, setCreated] = useState<CreatedCampaign | null>(null);

  function showCreated(campaign: CreatedCampaign) {
    setFormOpen(false);
    setCreated(campaign);
    loadPage(0);
  }

  return (
    <PageLayout>
      <Group className={styles.header}>
        <Title order={1}>Кампании Keitaro</Title>
        <Group gap="sm">
          <Button variant="default" disabled={list.status === 'loading'} onClick={() => loadPage(page)}>
            Обновить
          </Button>
          <Button onClick={() => { setCreated(null); setFormOpen(true); }}>Новая кампания</Button>
        </Group>
      </Group>
      {created && <CreationNotice campaign={created} />}
      {list.status === 'loading' && (
        <Group role="status"><Loader size="sm" /><Text className={styles.muted}>Загрузка кампаний…</Text></Group>
      )}
      {list.status === 'error' && (
        <Alert color="red" title="Не удалось загрузить кампании" role="alert">
          <Group className={styles.errorActions}>
            <Text size="sm">{list.message}</Text>
            <Button size="compact-sm" variant="default" onClick={() => loadPage(page)}>Повторить</Button>
          </Group>
        </Alert>
      )}
      {list.status === 'ready' && (
        <CampaignTable data={list.data} page={page} knownPageCount={knownPageCount} onPageChange={loadPage} />
      )}
      {formOpen && <CampaignForm onClose={() => setFormOpen(false)} onCreated={showCreated} />}
    </PageLayout>
  );
}
