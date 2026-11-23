import { Alert, Text } from '@mantine/core';

import { ExternalLink } from '../../../../../../shared/components/ExternalLink/ExternalLink';
import styles from './CreationError.module.css';
import type { CreationErrorProps } from './CreationError.types';

const stepNames: Record<string, string> = {
  validate: 'Проверка настроек',
  campaign: 'Создание кампании',
  geo_stream: 'Настройка GEO-потока',
  offer_stream: 'Настройка потока с оффером',
  verify: 'Проверка настроек в Keitaro',
  enable: 'Включение кампании',
};

export function CreationError({ error }: CreationErrorProps) {
  return (
    <Alert color="red" title={error.step ? stepNames[error.step] : 'Не удалось создать кампанию'} role="alert">
      {error.message}
      {error.campaign_id && (
        <Text size="sm" className={styles.errorDetail}>
          <ExternalLink href={error.admin_url}>
            Кампания №{error.campaign_id}
          </ExternalLink>
          {error.campaign_state === 'disabled' && ' отключена.'}
          {error.campaign_state === 'unknown' && ' — статус не подтверждён.'}
        </Text>
      )}
      {!error.campaign_id && error.alias && (
        <Text size="sm" className={styles.errorDetail}>Проверьте в Keitaro, появилась ли кампания с идентификатором {error.alias}.</Text>
      )}
    </Alert>
  );
}
