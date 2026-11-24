import { Alert, Group, Loader, Switch, Text } from '@mantine/core';

import { PageLayout } from '@/shared/components/PageLayout/PageLayout';
import styles from './CampaignEditorPage.module.css';
import type { CampaignEditorPageProps } from './CampaignEditorPage.types';
import { EditorHeader } from './components/EditorHeader/EditorHeader';
import { ExternalChangeDialog } from './components/ExternalChangeDialog/ExternalChangeDialog';
import { StreamEditor } from './components/StreamEditor/StreamEditor';
import { useCampaignEditor } from './hooks/useCampaignEditor';

export function CampaignEditorPage({ id }: CampaignEditorPageProps) {
  const {
    editor, busy, error, notice, hasDraft, changed, warningOpen, confirming, publicationRequested,
    update, refresh, setCampaignEnabled, discard, requestPublish, confirmPublish, dismissWarning,
  } = useCampaignEditor(id);
  const campaign = editor?.campaign;

  return (
    <PageLayout>
      <EditorHeader
        campaign={campaign}
        hasDraft={hasDraft}
        busy={busy}
        onRefresh={refresh}
        onDiscard={discard}
        onPublish={requestPublish}
      />
      {busy && (
        <Group role="status" className={styles.compact}>
          <Loader size="xs" /><Text size="sm">Выполняем запрос…</Text>
        </Group>
      )}
      {!editor && !busy && !error && <Text role="status">Загрузка кампании…</Text>}
      {error && <Alert color="red" role="alert">{error}</Alert>}
      {notice && <Alert color="teal" role="status">{notice}</Alert>}
      {changed && (
        <Alert color="orange" title="Кампания изменилась в Keitaro">
          Проверьте текущие настройки перед публикацией черновика.
        </Alert>
      )}
      {(campaign?.state === 'active' || campaign?.state === 'disabled') && (
        <Switch
          label="Кампания включена"
          checked={campaign.state === 'active'}
          disabled={busy}
          onChange={(event) => setCampaignEnabled(event.currentTarget.checked)}
        />
      )}
      {editor?.streams.length === 0 && <Text className={styles.muted}>У кампании нет потоков.</Text>}
      {editor?.streams.map((stream) => <StreamEditor key={stream.id} stream={stream} busy={busy} onEdit={update} />)}
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
