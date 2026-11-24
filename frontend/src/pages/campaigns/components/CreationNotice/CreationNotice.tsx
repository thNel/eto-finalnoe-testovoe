import { Alert, Anchor, Group } from '@mantine/core';
import { Link } from 'react-router';

import { ExternalLink } from '../../../../shared/components/ExternalLink/ExternalLink';
import type { CreationNoticeProps } from './CreationNotice.types';

export function CreationNotice({ campaign }: CreationNoticeProps) {
  return (
    <Alert color="teal" title={`Кампания «${campaign.name}» создана`} role="status">
      <Group>
        <Anchor component={Link} to={`/campaigns/${campaign.id}`}>Открыть редактор</Anchor>
        {campaign.tracking_url && <ExternalLink href={campaign.tracking_url}>Ссылка кампании</ExternalLink>}
        <ExternalLink href={campaign.admin_url}>Открыть в Keitaro</ExternalLink>
      </Group>
    </Alert>
  );
}
