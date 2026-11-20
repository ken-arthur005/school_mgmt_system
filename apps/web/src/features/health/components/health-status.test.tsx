import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { healthCopy } from '../copy';
import { HealthStatus } from './health-status';

function renderWithClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <HealthStatus />
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HealthStatus', () => {
  test('shows checking, then healthy when the API answers ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ status: 'ok', env: 'development' }))),
    );
    renderWithClient();
    expect(screen.getByText(healthCopy.checking)).toBeInTheDocument();
    expect(await screen.findByText(healthCopy.healthy)).toBeInTheDocument();
  });

  test('shows the offline message and a retry button when the API is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    renderWithClient();
    expect(await screen.findByText(healthCopy.offline)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: healthCopy.retry })).toBeInTheDocument();
  });

  test('treats an unexpected answer as an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ status: 'down' }))),
    );
    renderWithClient();
    expect(await screen.findByText(healthCopy.offline)).toBeInTheDocument();
  });

  test('retry recovers once the API is back', async () => {
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(jsonResponse({ status: 'ok', env: 'development' }));
    vi.stubGlobal('fetch', fetchMock);
    renderWithClient();

    await userEvent.click(await screen.findByRole('button', { name: healthCopy.retry }));
    expect(await screen.findByText(healthCopy.healthy)).toBeInTheDocument();
  });
});
