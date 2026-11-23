export interface ApiErrorDetail {
  message: string;
  code?: string;
  remote_revision?: string;
  step?: string;
  campaign_id?: number;
  campaign_state?: string;
  alias?: string;
  admin_url?: string;
}

export class ApiError extends Error {
  constructor(public readonly detail: ApiErrorDetail) {
    super(detail.message);
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, init);
  if (response.ok) return response.json();

  const body = await response.json().catch(() => null);
  const detail = body?.detail;
  if (typeof detail?.message === 'string') throw new ApiError(detail);
  if (Array.isArray(detail)) {
    const geoError = detail.find((item) => item.loc?.includes('geo') && typeof item.msg === 'string');
    const message = geoError?.msg.replace(/^Value error, /, '') ?? 'Проверьте название, GEO и оффер.';
    throw new ApiError({ message });
  }
  throw new ApiError({ message: `API вернул ошибку HTTP ${response.status}.` });
}
