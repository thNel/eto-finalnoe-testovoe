import { Navigate, useParams } from 'react-router';

import { CampaignEditorPage } from './CampaignEditorPage';

/**
 * Извлекает и проверяет ID кампании из URL до открытия редактора.
 * Если ID некорректный, возвращает на список кампаний без запросов редактора и подписки на WebSocket.
 */
export function CampaignEditorRoute() {
  const { campaignId } = useParams<'campaignId'>();
  const id = Number(campaignId);

  if (!Number.isSafeInteger(id) || id <= 0 || String(id) !== campaignId) {
    return <Navigate to="/" replace />;
  }

  // Когда меняется только ID кампании, React Router может переиспользовать маршрут.
  // Новый key пересоздаёт редактор и сразу сбрасывает данные и открытые окна
  // предыдущей кампании. Сохранённый черновик остаётся в базе данных.
  return <CampaignEditorPage key={id} id={id} />;
}
