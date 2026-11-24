import { ActionIcon, Badge, Group, Pagination, Paper, Table, Text } from '@mantine/core';
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { Link, useNavigate } from 'react-router';

import { DataTable } from '@/shared/components/DataTable/DataTable';
import styles from './CampaignTable.module.css';
import type { CampaignTableProps } from './CampaignTable.types';

const columns = ['Кампания', 'Статус', 'Действие'];

const states: Record<string, { label: string; color: string }> = {
  active: { label: 'Активна', color: 'teal' },
  disabled: { label: 'Отключена', color: 'gray' },
  deleted: { label: 'В архиве', color: 'gray' },
};

export function CampaignTable({ data, page, knownPageCount, onPageChange }: CampaignTableProps) {
  const navigate = useNavigate();

  return (
    <>
      {data.items.length === 0 ? (
        <Paper withBorder radius="md" className={styles.emptyState}>
          <Text className={styles.muted}>Кампаний на этой странице пока нет.</Text>
        </Paper>
      ) : (
        <Paper withBorder radius="md" className={styles.table}>
          <DataTable columns={columns} minWidth={440} highlightRows>
            {data.items.map((campaign) => (
              <Table.Tr
                key={campaign.id}
                className={styles.campaignRow}
                onDoubleClick={(event) => {
                  if (event.target instanceof Element && !event.target.closest('a, button')) {
                    navigate(`/campaigns/${campaign.id}`);
                  }
                }}
              >
                <Table.Td>
                  <Text size="sm" className={styles.campaignName}>{campaign.name}</Text>
                  <Text size="xs" className={styles.muted}>#{campaign.id}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge
                    variant="light"
                    color={states[campaign.state]?.color ?? 'gray'}
                    classNames={{ root: styles.statusBadge, label: styles.statusLabel }}
                  >
                    {states[campaign.state]?.label ?? campaign.state}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group className={styles.rowActions} wrap="nowrap">
                    <ActionIcon
                      component={Link}
                      to={`/campaigns/${campaign.id}`}
                      variant="subtle"
                      size="lg"
                      aria-label="Редактировать"
                      title="Редактировать"
                    >
                      <PencilSimpleIcon size={18} aria-hidden="true" />
                    </ActionIcon>
                    <ActionIcon
                      component="a"
                      href={campaign.admin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="subtle"
                      size="lg"
                      aria-label="Открыть в Keitaro"
                      title="Открыть в Keitaro"
                    >
                      <ArrowSquareOutIcon size={18} aria-hidden="true" />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </DataTable>
        </Paper>
      )}
      <Pagination
        component="nav"
        aria-label="Страницы кампаний"
        className={styles.pagination}
        total={knownPageCount}
        value={page + 1}
        onChange={(nextPage) => onPageChange(nextPage - 1)}
        layout="responsive"
        hideWithOnePage
        formatLabel={({ page: current }) => `Страница ${current}`}
        getItemProps={(number) => ({ 'aria-label': `Страница ${number}` })}
        getControlProps={(control) => ({
          'aria-label': control === 'previous' ? 'Предыдущая страница' : 'Следующая страница',
        })}
      />
    </>
  );
}
