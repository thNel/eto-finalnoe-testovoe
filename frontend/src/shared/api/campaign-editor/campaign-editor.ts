import type {
  CampaignEditor, CampaignStatusRequest, EditDraftRequest, OfferEdit, PublishDraftRequest,
} from './campaign-editor.dto';
import { request } from '../http/http';

export function readEditor(id: number, signal?: AbortSignal) {
  return request<CampaignEditor>(`/campaigns/${id}`, { signal });
}

export function changeCampaignStatus(id: number, body: CampaignStatusRequest) {
  return request<CampaignEditor>(`/campaigns/${id}/state`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function editDraft(id: number, version: number, edit: OfferEdit) {
  const body: EditDraftRequest = { ...edit, version };
  return request<CampaignEditor>(`/campaigns/${id}/draft`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function discardDraft(id: number, version: number) {
  return request<CampaignEditor>(`/campaigns/${id}/draft?version=${version}`, { method: 'DELETE' });
}

export function publishDraft(id: number, version: number, confirmRevision?: string) {
  const body: PublishDraftRequest = { version, confirm_revision: confirmRevision };
  return request<CampaignEditor>(`/campaigns/${id}/publications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
