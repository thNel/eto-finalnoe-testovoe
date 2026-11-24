import { Fragment } from 'react';

import type { BreakableTextProps } from './BreakableText.types';

export function BreakableText({ children }: BreakableTextProps) {
  const parts = children.split(/([_/]+)/);

  return parts.map((part, index) => (
    <Fragment key={index}>
      {index % 2 === 1 && <wbr />}
      {part}
    </Fragment>
  ));
}
