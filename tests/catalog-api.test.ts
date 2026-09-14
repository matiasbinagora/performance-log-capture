import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../src/app.js';
import { loadScenarioConfig } from '../src/scenarios/scenario-config.js';

const testScenarioConfig = loadScenarioConfig({ SEARCH_DELAY_MS: '0', SEARCH_ERROR_RATE: '0', RUN_ID: 'api-test' });

interface RecordedEvent {
  readonly runId: string;
  readonly requestId: string;
  readonly operation: string;
  readonly status: number;
  readonly duration: number;
  readonly timestamp: string;
  readonly errorCode?: string;
}

describe('catalog API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp(undefined, testScenarioConfig);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns a JSON health response', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('returns a known product detail', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/products/aurora-desk-lamp',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      product: {
        id: 'aurora-desk-lamp',
        name: 'Aurora Desk Lamp',
        price: { amount: 79.99, currency: 'USD' },
      },
    });
  });

  it('returns deterministic search results', async () => {
    const firstResponse = await app.inject({ method: 'GET', url: '/products/search?q=office' });
    const secondResponse = await app.inject({ method: 'GET', url: '/products/search?q=office' });

    expect(firstResponse.statusCode).toBe(200);
    expect(firstResponse.json()).toEqual(secondResponse.json());
    expect(firstResponse.json()).toMatchObject({
      query: 'office',
      count: 3,
      products: [
        { id: 'aurora-desk-lamp' },
        { id: 'cedar-monitor-stand' },
        { id: 'northstar-notebook' },
      ],
    });
  });

  it('returns a useful structured 404 for an unknown product', async () => {
    const response = await app.inject({ method: 'GET', url: '/products/unknown-product' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'PRODUCT_NOT_FOUND',
        message: "Product 'unknown-product' was not found.",
        statusCode: 404,
      },
    });
  });

  it('returns a consistent validation error when search is missing', async () => {
    const response = await app.inject({ method: 'GET', url: '/products/search' });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'SEARCH_QUERY_REQUIRED',
        message: "Query parameter 'q' is required.",
        statusCode: 400,
      },
    });
  });

  it('delays search without delaying product detail', async () => {
    const delayedApp = await buildApp(undefined, loadScenarioConfig({ SEARCH_DELAY_MS: '25', SEARCH_ERROR_RATE: '0', RUN_ID: 'timing-test' }));
    try {
      const detailStartedAt = performance.now();
      await delayedApp.inject({ method: 'GET', url: '/products/aurora-desk-lamp' });
      const detailDuration = performance.now() - detailStartedAt;
      const searchStartedAt = performance.now();
      await delayedApp.inject({ method: 'GET', url: '/products/search?q=desk' });
      const searchDuration = performance.now() - searchStartedAt;

      expect(searchDuration).toBeGreaterThanOrEqual(20);
      expect(searchDuration).toBeGreaterThan(detailDuration + 10);
    } finally {
      await delayedApp.close();
    }
  });

  it('writes structured request events with unique IDs', async () => {
    const events: string[] = [];
    const write = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      events.push(String(chunk));
      return true;
    });
    try {
      await app.inject({ method: 'GET', url: '/health' });
      await app.inject({ method: 'GET', url: '/products/unknown-product' });
    } finally {
      write.mockRestore();
    }

    const parsedEvents: RecordedEvent[] = events.map((event): RecordedEvent => JSON.parse(event.trim()) as RecordedEvent);
    expect(parsedEvents).toHaveLength(2);
    expect(new Set(parsedEvents.map((event) => event.requestId)).size).toBe(2);
    expect(parsedEvents[0]).toMatchObject({ runId: 'api-test', operation: 'health', status: 200 });
    expect(parsedEvents[1]).toMatchObject({ runId: 'api-test', operation: 'product_detail', status: 404, errorCode: 'PRODUCT_NOT_FOUND' });
    const firstEvent = parsedEvents[0];
    expect(firstEvent).toBeDefined();
    if (firstEvent) {
      expect(typeof firstEvent.duration).toBe('number');
      expect(typeof firstEvent.timestamp).toBe('string');
    }
  });

  it('writes ROUTE_NOT_FOUND to the event for an unknown route', async () => {
    const events: string[] = [];
    const write = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      events.push(String(chunk));
      return true;
    });
    try {
      const response = await app.inject({ method: 'GET', url: '/not-a-route' });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ error: { code: 'ROUTE_NOT_FOUND', statusCode: 404 } });
    } finally {
      write.mockRestore();
    }

    expect(events).toHaveLength(1);
    expect(JSON.parse(events[0]?.trim() ?? '')).toMatchObject({
      operation: 'unknown',
      status: 404,
      errorCode: 'ROUTE_NOT_FOUND',
    });
  });
});
