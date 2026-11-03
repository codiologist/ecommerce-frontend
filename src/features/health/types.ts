/** Mirrors the backend's GET /api/v1/health response data. */
export type HealthStatus = {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  checks: { database: 'up' | 'down' };
};
