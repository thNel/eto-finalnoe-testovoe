import { Alert, Anchor, Badge, Button, Container, Group, Loader, Modal, Stack, Text, Title } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';

import {
  ApiError,
  type CampaignEditor,
  type OfferEdit,
  discardDraft,
  editDraft,
  publishDraft,
  readEditor,
} from './api';
import { StreamEditor } from './StreamEditor';

export function CampaignEditorPage({ id }: { id: number }) {
  const [editor, setEditor] = useState<CampaignEditor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [dismissedRevision, setDismissedRevision] = useState<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    readEditor(id, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setEditor(data); })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message || 'Не удалось загрузить кампанию.');
      });
    return () => controller.abort();
  }, [id]);

  async function run(request: () => Promise<CampaignEditor>, success?: string) {
    if (busyRef.current) return false;
    busyRef.current = true;
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
