import { Anchor } from '@mantine/core';

import type { ExternalLinkProps } from './ExternalLink.types';

export function ExternalLink({ href, children, compact }: ExternalLinkProps) {
  return (
    <Anchor href={href} target="_blank" rel="noopener noreferrer" size={compact ? 'sm' : undefined}>
      {children}
    </Anchor>
  );
}
