import { Alert, Anchor, Group, Loader, Text } from '@mantine/core';
import { Link } from 'react-router';

import { PageLayout } from '../../shared/components/PageLayout/PageLayout';
import styles from './CampaignEditorPage.module.css';
import type { CampaignEditorPageProps } from './CampaignEditorPage.types';
import { EditorHeader } from './components/EditorHeader/EditorHeader';
import { ExternalChangeDialog } from './components/ExternalChangeDialog/ExternalChangeDialog';
import { StreamEditor } from './components/StreamEditor/StreamEditor';
import { useCampaignEditor } from './hooks/useCampaignEditor';

export function CampaignEditorPage({ id }: CampaignEditorPageProps) {
  const {
    editor, busy, error, notice, hasDraft, changed, warningOpen, confirming,
    update, refresh, discard, requestPublish, confirmPublish, dismissWarning,
  } = useCampaignEditor(id);

  return (
    <PageLayout>
      <Anchor component={Link} to="/" size="sm">Все кампании</Anchor>
      <EditorHeader
        campaign={editor?.campaign}
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
      {editor?.streams.length === 0 && <Text className={styles.muted}>У кампании нет потоков.</Text>}
      {editor?.streams.map((stream) => <StreamEditor key={stream.id} stream={stream} busy={busy} onEdit={update} />)}
      <ExternalChangeDialog
        opened={warningOpen}
        busy={busy}
        error={error}
        adminUrl={editor?.campaign.admin_url}
        onClose={dismissWarning}
        onConfirm={confirming && editor ? confirmPublish : undefined}
      />
    </PageLayout>
  );
}
