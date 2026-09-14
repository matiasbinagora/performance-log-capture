import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { CatalogService } from '../application/catalog-service.js';
import { normalizeSearchTerm } from '../application/catalog-service.js';
import { ApiError } from './api-error.js';
import type { ScenarioRuntime } from '../scenarios/deterministic-scenario.js';

interface ProductParams {
  id: string;
}

interface SearchQuery {
  q?: string;
}

export function registerCatalogRoutes(
  app: FastifyInstance,
  catalogService: CatalogService,
  scenarioRuntime: ScenarioRuntime,
  markRequestError: (request: FastifyRequest, errorCode: string) => void,
): void {
  app.get('/health', () => ({ status: 'ok' as const }));

  app.get<{ Params: ProductParams }>('/products/:id', (request) => {
    const product = catalogService.findProductById(request.params.id);

    if (!product) {
      throw new ApiError(
        404,
        'PRODUCT_NOT_FOUND',
        `Product '${request.params.id}' was not found.`,
      );
    }

    return { product };
  });

  app.get<{ Querystring: SearchQuery }>('/products/search', (request) => {
    const query = normalizeSearchTerm(request.query.q ?? '');

    if (!query) {
      throw new ApiError(400, 'SEARCH_QUERY_REQUIRED', "Query parameter 'q' is required.");
    }

    return scenarioRuntime.prepareSearch().then((outcome) => {
      if (outcome.failed && outcome.errorCode) {
        markRequestError(request, outcome.errorCode);
        throw new ApiError(503, outcome.errorCode, 'The search scenario produced a deterministic simulated failure.');
      }

      const matchingProducts = catalogService.searchProducts(query);
      return { query, count: matchingProducts.length, products: matchingProducts };
    });
  });
}
