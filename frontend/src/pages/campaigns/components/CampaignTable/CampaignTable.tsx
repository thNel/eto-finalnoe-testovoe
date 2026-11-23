import { Anchor, Badge, Button, Group, Paper, Table, Text } from '@mantine/core';
import { Link } from 'react-router';

import { DataTable } from '../../../../shared/components/DataTable/DataTable';
import { ExternalLink } from '../../../../shared/components/ExternalLink/ExternalLink';
import styles from './CampaignTable.module.css';
import type { CampaignTableProps } from './CampaignTable.types';

const columns = ['Кампания', 'Статус', 'Действие'];

const states: Record<string, { label: string; color: string }> = {
  active: { label: 'Активна', color: 'teal' },
  disabled: { label: 'Отключена', color: 'gray' },
  deleted: { label: 'В архиве', color: 'gray' },
};

export function CampaignTable({ data, page, onPageChange }: CampaignTableProps) {
  return (
    <>
      {data.items.length === 0 ? (
        <Paper withBorder radius="md" className={styles.emptyState}>
          <Text className={styles.muted}>Кампаний на этой странице пока нет.</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md">
          <DataTable columns={columns} minWidth={440} highlightRows>
            {data.items.map((campaign) => (
              <Table.Tr key={campaign.id}>
                <Table.Td>
                  <Text size="sm" className={styles.campaignName}>{campaign.name}</Text>
                  <Text size="xs" className={styles.muted}>#{campaign.id}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={states[campaign.state]?.color ?? 'gray'}>
                    {states[campaign.state]?.label ?? campaign.state}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group className={styles.rowActions}>
                    <Anchor component={Link} to={`/campaigns/${campaign.id}`} size="sm">Редактировать</Anchor>
                    <ExternalLink href={campaign.admin_url} compact>Открыть в Keitaro</ExternalLink>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </DataTable>
        </Paper>
      )}
      <Group className={styles.pagination}>
        <Button variant="default" disabled={page === 0} onClick={() => onPageChange(page - 1)}>Назад</Button>
        <Text size="sm" className={styles.muted}>Страница {page + 1}</Text>
        <Button variant="default" disabled={!data.has_more} onClick={() => onPageChange(page + 1)}>Далее</Button>
      </Group>
    </>
  );
}
