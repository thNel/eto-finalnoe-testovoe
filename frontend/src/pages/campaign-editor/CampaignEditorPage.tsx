import { Alert, Anchor, Badge, Button, Container, Group, Loader, Modal, Stack, Text, Title } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';

import {
  type CampaignEditor,
  type OfferEdit,
  discardDraft,
  editDraft,
  publishDraft,
  readEditor,
} from '../../shared/api/campaign-editor';
import { ApiError } from '../../shared/api/http';
import { useCampaignEvents } from '../../shared/hooks/useCampaignEvents';
import { StreamEditor } from './components/StreamEditor';

interface RefreshRequest {
  revision: string | null;
  force: boolean;
}

export function CampaignEditorPage({ id }: { id: number }) {
  const [editor, setEditor] = useState<CampaignEditor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [dismissedRevision, setDismissedRevision] = useState<string | null>(null);
  const [refreshRequest, setRefreshRequest] = useState<RefreshRequest | null>(null);
  const busyRef = useRef(false);
  const operationGeneration = useRef(0);
  const currentRevision = editor?.remote_revision;
  const initialReadFinished = editor !== null || error !== null;

  useEffect(() => {
    const controller = new AbortController();
    readEditor(id, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setEditor(data); })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message || 'Не удалось загрузить кампанию.');
      });
    return () => controller.abort();
  }, [id]);

  useCampaignEvents(
    id,
    (revision, reconnected) => setRefreshRequest((pending) => ({
      revision,
      force: reconnected || (pending?.force ?? false),
    })),
  );

  useEffect(() => {
    if (!refreshRequest || !initialReadFinished || busy) return;
    const request = refreshRequest;
    const acknowledge = () => setRefreshRequest((pending) => pending === request ? null : pending);
    if (!request.force && request.revision === currentRevision) {
      acknowledge();
      return;
    }

    const controller = new AbortController();
    const generation = operationGeneration.current;
    const interrupted = () => controller.signal.aborted || busyRef.current || operationGeneration.current !== generation;
    let retryTimer: number | undefined;
    let retryDelay = 1000;

    async function refresh() {
      try {
        const latest = await readEditor(id, controller.signal);
        if (interrupted()) return;
        setEditor(latest);
        if (currentRevision === undefined) setError(null);
        acknowledge();
      } catch (failure) {
        if (interrupted()) return;
        if (failure instanceof ApiError && failure.detail.code === 'campaign_missing') {
          setEditor(null);
          setError(failure.message);
          acknowledge();
          return;
        }
        retryTimer = window.setTimeout(refresh, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 15_000);
      }
    }

    void refresh();
    return () => {
      controller.abort();
      window.clearTimeout(retryTimer);
    };
  }, [busy, currentRevision, id, initialReadFinished, refreshRequest]);

  async function run(request: () => Promise<CampaignEditor>, success?: string) {
    if (busyRef.current) return false;
    busyRef.current = true;
    operationGeneration.current += 1;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setEditor(await request());
      if (success) setNotice(success);
      setConfirming(false);
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Операция не выполнена.');
      if (failure instanceof ApiError) {
        const code = failure.detail.code;
        if (code === 'external_change') {
          setDismissedRevision(null);
          setConfirming(true);
        }
        if (code === 'external_change' || code === 'draft_version' || code === 'publication_failed') {
          try {
            setEditor(await readEditor(id));
          } catch {
            setError(`${failure.message} Обновите кампанию, чтобы получить актуальные данные.`);
          }
        }
      }
      return false;
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }

  function update(edit: OfferEdit) {
    return editor ? run(() => editDraft(id, editor.version, edit)) : Promise.resolve(false);
  }

  function publish(confirmRevision?: string) {
    if (editor) void run(
      () => publishDraft(id, editor.version, confirmRevision),
      'Изменения опубликованы в Keitaro.',
    );
  }

  function dismissWarning() {
    setDismissedRevision(editor?.remote_revision ?? null);
    setConfirming(false);
  }

  const hasDraft = editor?.mode === 'draft';
  const changed = editor?.external_changed;
  const warningOpen = Boolean(changed && (confirming || dismissedRevision !== editor?.remote_revision));

  return (
    <Container component="main" size="lg" py={{ base: 'lg', sm: 48 }}>
      <Stack gap="lg">
        <Anchor href="/" size="sm">Все кампании</Anchor>
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs">
            <Group gap="sm">
              <Title order={1}>{editor?.campaign.name ?? 'Редактор кампании'}</Title>
              {hasDraft && <Badge color="yellow">Черновик</Badge>}
            </Group>
            {editor && (
              <Anchor href={editor.campaign.admin_url} target="_blank" rel="noopener noreferrer" size="sm">
                Открыть в Keitaro
              </Anchor>
            )}
          </Stack>
          <Group gap="xs">
            <Button variant="default" disabled={busy} onClick={() => void run(() => readEditor(id))}>Обновить</Button>
            {hasDraft && editor && (
              <>
                <Button
                  variant="default"
                  disabled={busy}
                  onClick={() => void run(() => discardDraft(id, editor.version), 'Черновик отменён.')}
                >
                  Отменить изменения
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => { if (changed) setConfirming(true); else publish(); }}
                >
                  Опубликовать
                </Button>
              </>
            )}
          </Group>
        </Group>
        {busy && <Group role="status" gap="xs"><Loader size="xs" /><Text size="sm">Выполняем запрос…</Text></Group>}
        {!editor && !busy && !error && <Text role="status">Загрузка кампании…</Text>}
        {error && <Alert color="red" role="alert">{error}</Alert>}
        {notice && <Alert color="teal" role="status">{notice}</Alert>}
        {changed && (
          <Alert color="orange" title="Кампания изменилась в Keitaro">
            Проверьте текущие настройки перед публикацией черновика.
          </Alert>
        )}
        {editor?.streams.length === 0 && <Text c="dimmed">У кампании нет потоков.</Text>}
        {editor?.streams.map((stream) => <StreamEditor key={stream.id} stream={stream} busy={busy} onEdit={update} />)}
      </Stack>
      <Modal
        opened={warningOpen}
        onClose={dismissWarning}
        title="Кампания изменилась в Keitaro"
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
        withCloseButton={!busy}
        centered
      >
        <Stack>
          <Text size="sm">
            Проверьте текущие настройки в Keitaro. Публикация перезапишет офферы и доли в изменённых потоках.
          </Text>
          {error && <Text size="sm" c="red">{error}</Text>}
          <Group gap="xs">
            <Button
              component="a"
              href={editor?.campaign.admin_url}
              target="_blank"
              rel="noopener noreferrer"
              variant="light"
            >
              Открыть в Keitaro
            </Button>
            <Button variant="default" disabled={busy} onClick={dismissWarning}>Продолжить редактирование</Button>
            {confirming && editor && (
              <Button color="orange" disabled={busy} onClick={() => publish(editor.remote_revision)}>
                Подтвердить перезапись
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
