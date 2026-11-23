import type { ReactNode } from 'react';

export interface DataTableProps {
  columns: readonly string[];
  minWidth: number;
  highlightRows?: boolean;
  children: ReactNode;
}
