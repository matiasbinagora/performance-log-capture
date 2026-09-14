import type { FastifyInstance } from 'fastify';

import type { CatalogService } from '../application/catalog-service.js';
import { normalizeSearchTerm } from '../application/catalog-service.js';
import { ApiError } from './api-error.js';

interface ProductParams {
  id: string;
}

interface SearchQuery {
  q?: string;
}

export function registerCatalogRoutes(
  app: FastifyInstance,
  catalogService: CatalogService,
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

    const matchingProducts = catalogService.searchProducts(query);

    return {
      query,
      count: matchingProducts.length,
      products: matchingProducts,
    };
  });
}
