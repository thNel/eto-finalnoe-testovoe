import type { Offer } from './offers.dto';
import { request } from './http';

export function searchOffers(query: string, signal: AbortSignal) {
  return request<Offer[]>(`/offers?q=${encodeURIComponent(query)}`, { signal });
}
