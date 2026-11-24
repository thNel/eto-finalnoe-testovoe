import { useEffect, useState } from 'react';

import { listCampaigns } from '../../../shared/api/campaigns/campaigns';
import type { ListState } from './useCampaignList.types';

const PAGE_SIZE = 25;

export function useCampaignList() {
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [page, setPage] = useState(0);
  const [knownPageCount, setKnownPageCount] = useState(1);
  const [request, setRequest] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listCampaigns(page * PAGE_SIZE, PAGE_SIZE, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setKnownPageCount((count) => data.has_more ? Math.max(count, page + 2) : page + 1);
          setList({ status: 'ready', data });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setList({
            status: 'error',
            message: error instanceof Error ? error.message : 'Не удалось загрузить кампании.',
          });
        }
      });
    return () => controller.abort();
  }, [page, request]);

  function loadPage(nextPage: number) {
    setList({ status: 'loading' });
    setPage(nextPage);
    setRequest((value) => value + 1);
  }

  return { list, page, knownPageCount, loadPage };
}
