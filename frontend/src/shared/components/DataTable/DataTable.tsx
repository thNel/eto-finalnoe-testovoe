import { Table } from '@mantine/core';

import type { DataTableProps } from './DataTable.types';

export function DataTable({ columns, minWidth, highlightRows = false, children }: DataTableProps) {
  return (
    <Table.ScrollContainer minWidth={minWidth}>
      <Table
        verticalSpacing="sm"
        highlightOnHover={highlightRows}
        horizontalSpacing={highlightRows ? 'md' : undefined}
      >
        <Table.Thead>
          <Table.Tr>
            {columns.map((column) => <Table.Th key={column}>{column}</Table.Th>)}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{children}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
