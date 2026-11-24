import { useEffect, useState } from 'react';

import { listCampaigns } from '../../../shared/api/campaigns/campaigns';
import { useCampaignEvents } from '../../../shared/hooks/useCampaignEvents';
import type { ListState } from './useCampaignList.types';

const PAGE_SIZE = 25;

export function useCampaignList() {
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [page, setPage] = useState(0);
  const [knownPageCount, setKnownPageCount] = useState(1);
  const [request, setRequest] = useState(0);
  const offset = page * PAGE_SIZE;

  useCampaignEvents(
    `/campaigns/events?offset=${offset}&limit=${PAGE_SIZE}`,
    () => setRequest((value) => value + 1),
  );

  useEffect(() => {
    const controller = new AbortController();
    listCampaigns(offset, PAGE_SIZE, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          if (page > 0 && !data.items.length) {
            setPage(page - 1);
            return;
          }
          setKnownPageCount((count) => data.has_more ? Math.max(count, page + 2) : page + 1);
          setList({ status: 'ready', data });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setList((previous) => previous.status === 'ready' ? previous : {
            status: 'error',
            message: error instanceof Error ? error.message : 'Не удалось загрузить кампании.',
          });
        }
      });
    return () => controller.abort();
  }, [offset, page, request]);

  function loadPage(nextPage: number) {
    setList({ status: 'loading' });
    setPage(nextPage);
    setRequest((value) => value + 1);
  }

  return { list, page, knownPageCount, loadPage };
}
