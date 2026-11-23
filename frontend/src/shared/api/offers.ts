import { request } from './http';

export interface Offer {
  id: number;
  name: string;
}

export function searchOffers(query: string, signal: AbortSignal) {
  return request<Offer[]>(`/offers?q=${encodeURIComponent(query)}`, { signal });
}
