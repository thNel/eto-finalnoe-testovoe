import { useEffect, useRef, useState } from 'react';

import { discardDraft, editDraft, publishDraft, readEditor } from '../../../shared/api/campaign-editor/campaign-editor';
import type { CampaignEditor, OfferEdit } from '../../../shared/api/campaign-editor/campaign-editor.dto';
import { ApiError } from '../../../shared/api/http/http';
import { useCampaignEvents } from '../../../shared/hooks/useCampaignEvents';
import type { RefreshRequest } from './useCampaignEditor.types';

export function useCampaignEditor(id: number) {
  const [editor, setEditor] = useState<CampaignEditor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmationRevision, setConfirmationRevision] = useState<string | null>(null);
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
    `/campaigns/${id}/events`,
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
      setConfirmationRevision(null);
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Операция не выполнена.');
      if (failure instanceof ApiError) {
        const code = failure.detail.code;
        if (code === 'external_change') {
          setDismissedRevision(null);
          setConfirmationRevision(failure.detail.remote_revision ?? null);
        }
        if (code === 'external_change' || code === 'draft_version' || code === 'publication_failed') {
          try {
            const latest = await readEditor(id);
            setEditor(latest);
            if (code === 'external_change' && latest.external_changed) {
              setConfirmationRevision(latest.remote_revision);
            }
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
    setConfirmationRevision(null);
  }

  const hasDraft = editor?.mode === 'draft';
  const changed = editor?.external_changed;
  const confirming = Boolean(changed && confirmationRevision === currentRevision);
  const warningOpen = Boolean(confirmationRevision || (changed && dismissedRevision !== currentRevision));

  function refresh() {
    return run(() => readEditor(id));
  }

  function discard() {
    if (editor) void run(() => discardDraft(id, editor.version), 'Черновик отменён.');
  }

  function requestPublish() {
    if (editor?.external_changed) setConfirmationRevision(editor.remote_revision);
    else publish();
  }

  function confirmPublish() {
    if (confirming && confirmationRevision) publish(confirmationRevision);
  }

  return {
    editor, busy, error, notice, hasDraft, changed, warningOpen, confirming,
    update, refresh, discard, requestPublish, confirmPublish, dismissWarning,
  };
}
