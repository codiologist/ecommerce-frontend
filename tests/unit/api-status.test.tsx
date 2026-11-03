import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiStatus } from '@/features/health/components/api-status';
import { __resetApiClientState } from '@/lib/api-client';

function renderWithClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ApiStatus />
    </QueryClientProvider>,
  );
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  __resetApiClientState();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const respond = (status: number, data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('<ApiStatus />', () => {
  it('shows online when the API and database are up', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(200, {
        status: 'ok',
        uptime: 1,
        timestamp: new Date().toISOString(),
        checks: { database: 'up' },
      }),
    );
    renderWithClient();
    expect(await screen.findByText('API online · database up')).toBeInTheDocument();
  });

  it('shows database down on a degraded 503', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(503, {
        status: 'degraded',
        uptime: 1,
        timestamp: new Date().toISOString(),
        checks: { database: 'down' },
      }),
    );
    renderWithClient();
    expect(await screen.findByText('API online · database down')).toBeInTheDocument();
  });

  it('shows unreachable on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    renderWithClient();
    expect(await screen.findByText('API unreachable')).toBeInTheDocument();
  });
});
