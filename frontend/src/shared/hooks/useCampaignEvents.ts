import { useEffect, useEffectEvent } from 'react';

import type { CampaignListRevisionEvent, CampaignRevisionEvent } from '../api/campaigns/campaign-events.dto';

export function useCampaignEvents(
  path: string,
  onRevision: (revision: string | null, reconnected: boolean) => void,
) {
  const publishRevision = useEffectEvent(onRevision);

  useEffect(() => {
    const url = new URL(`/api/v1${path}`, window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

    let socket: WebSocket | undefined;
    let retryTimer: number;
    let retryDelay = 1000;
    let connectedBefore = false;
    let disposed = false;

    function connect() {
      let reconnected = connectedBefore;
      socket = new WebSocket(url);
      socket.onopen = () => {
        if (disposed) return;
        connectedBefore = true;
        retryDelay = 1000;
      };
      socket.onmessage = ({ data }) => {
        if (disposed || typeof data !== 'string') return;
        try {
          const event: Partial<CampaignRevisionEvent | CampaignListRevisionEvent> | null = JSON.parse(data);
          const valid = event?.type === 'campaign_revision'
            ? path === `/campaigns/${event.campaign_id}/events`
              && (typeof event.remote_revision === 'string' || event.remote_revision === null)
            : event?.type === 'campaign_list_revision' && path.startsWith('/campaigns/events?')
              && typeof event.remote_revision === 'string';
          if (valid && event && event.remote_revision !== undefined) {
            publishRevision(event.remote_revision, reconnected);
            reconnected = false;
          }
        } catch {
          // A malformed message has no campaign revision to apply.
        }
      };
      socket.onclose = () => {
        if (disposed) return;
        retryTimer = window.setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      };
    }

    retryTimer = window.setTimeout(connect, 0);
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [path]);
}
