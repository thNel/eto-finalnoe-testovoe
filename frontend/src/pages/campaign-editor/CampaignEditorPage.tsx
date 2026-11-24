import {Alert, Flex, Loader, Switch, Text} from '@mantine/core';

import {GlobalProgress} from '@/shared/components/GlobalProgress/GlobalProgress';
import {PageLayout} from '@/shared/components/PageLayout/PageLayout';
import styles from './CampaignEditorPage.module.css';
import type {CampaignEditorPageProps} from './CampaignEditorPage.types';
import {EditorHeader} from './components/EditorHeader/EditorHeader';
import {ExternalChangeDialog} from './components/ExternalChangeDialog/ExternalChangeDialog';
import {StreamEditor} from './components/StreamEditor/StreamEditor';
import {useCampaignEditor} from './hooks/useCampaignEditor';

export function CampaignEditorPage({id}: CampaignEditorPageProps) {
  const {
    editor, busy, error, hasDraft, warningOpen, confirming, publicationRequested,
    update, refresh, setCampaignEnabled, discard, requestPublish, confirmPublish, dismissWarning,
  } = useCampaignEditor(id);
  const campaign = editor?.campaign;
  const isLoading = !editor && !busy && !error

  return (
    <PageLayout>
      <GlobalProgress active={busy}/>
      <EditorHeader
        campaign={campaign}
        hasDraft={hasDraft}
        busy={busy}
        onRefresh={refresh}
        onDiscard={discard}
        onPublish={requestPublish}
      />
      {isLoading && <Flex align="center" justify="center" direction="column" gap="md" className={styles.loader}>
        <Loader size="lg"/>
        <Text role="status">Загрузка кампании…</Text>
      </Flex>}
      {error && <Alert color="red" role="alert">{error}</Alert>}
      {(campaign?.state === 'active' || campaign?.state === 'disabled') && (
        <Switch
          label="Кампания включена"
          checked={campaign.state === 'active'}
          disabled={busy}
          onChange={(event) => setCampaignEnabled(event.currentTarget.checked)}
          color="teal"
        />
      )}
      {editor?.streams.length === 0 && <Text className={styles.muted}>У кампании нет потоков.</Text>}
      {editor?.streams.map((stream) => <StreamEditor key={stream.id} stream={stream} busy={busy} onEdit={update}/>)}
      <ExternalChangeDialog
        opened={warningOpen}
        publicationRequested={publicationRequested}
        busy={busy}
        error={error}
        adminUrl={campaign?.admin_url}
        onClose={dismissWarning}
        onDiscard={hasDraft ? discard : undefined}
        onConfirm={confirming && editor ? confirmPublish : undefined}
      />
    </PageLayout>
  );
}
