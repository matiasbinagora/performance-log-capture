import staticPlugin from '@fastify/static';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCatalogService } from './application/catalog-service.js';
import { ApiError } from './api/api-error.js';
import { registerCatalogRoutes } from './api/catalog-routes.js';
import { products } from './domain/products.js';

export async function buildApp(
  options: FastifyServerOptions = { logger: false },
): Promise<FastifyInstance> {
  const app = Fastify(options);
  const catalogService = createCatalogService(products);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send(error.toResponse());
    }

    request.log.error({ err: error }, 'Unhandled request error');
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
        statusCode: 500,
      },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    const error = new ApiError(404, 'ROUTE_NOT_FOUND', `Route '${request.method} ${request.url}' was not found.`);
    return reply.status(error.statusCode).send(error.toResponse());
  });

  registerCatalogRoutes(app, catalogService);
  await app.register(staticPlugin, {
    root: join(fileURLToPath(new URL('.', import.meta.url)), '../public'),
  });

  return app;
}
