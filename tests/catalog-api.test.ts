import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

describe('catalog API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
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
});
