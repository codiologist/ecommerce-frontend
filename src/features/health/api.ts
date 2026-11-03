import { apiClient } from '@/lib/api-client';

import type { HealthStatus } from './types';

export function getHealth(signal?: AbortSignal): Promise<HealthStatus> {
  // 503 still carries a success envelope with status "degraded".
  return apiClient.get<HealthStatus>('/health', {
    acceptStatuses: [503],
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  });
}
