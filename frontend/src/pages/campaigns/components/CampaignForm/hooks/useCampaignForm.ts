import { type FormEvent, useState } from 'react';

import { createCampaign } from '@/shared/api/campaigns/campaigns';
import { ApiError } from '@/shared/api/http/http';
import type { ApiErrorDetail } from '@/shared/api/http/http.dto';
import type { Offer } from '@/shared/api/offers/offers.dto';
import type { CampaignFormProps } from '../CampaignForm.types';

export function useCampaignForm(onCreated: CampaignFormProps['onCreated']) {
  const [name, setName] = useState('');
  const [geo, setGeo] = useState('');
  const [selected, setSelected] = useState<Offer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiErrorDetail | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !selected) return;

    const codes = geo.trim().toUpperCase().split(/[\s,]+/).filter(Boolean);
    if (!name.trim() || !codes.length || codes.some((code) => !/^[A-Z]{2}$/.test(code))) {
      setError({ message: 'Укажите название кампании и GEO двухбуквенными кодами, например PL, AU.' });
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      onCreated(await createCampaign({ name: name.trim(), geo: codes, offer_id: selected.id }));
    } catch (failure) {
      setError(failure instanceof ApiError
        ? failure.detail
        : { message: 'Связь с API прервалась. Обновите список кампаний перед повторной попыткой.' });
      setSubmitting(false);
    }
  }

  return { name, setName, geo, setGeo, selected, setSelected, submitting, error, submit };
}
