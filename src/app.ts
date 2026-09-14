import staticPlugin from '@fastify/static';
import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyServerOptions } from 'fastify';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCatalogService } from './application/catalog-service.js';
import { ApiError } from './api/api-error.js';
import { registerCatalogRoutes } from './api/catalog-routes.js';
import { products } from './domain/products.js';
import { createScenarioRuntime } from './scenarios/deterministic-scenario.js';
import { loadScenarioConfig, type ScenarioConfig } from './scenarios/scenario-config.js';
import { registerRequestEventLogging } from './scenarios/request-events.js';

export async function buildApp(
  options: FastifyServerOptions = { logger: false },
  scenarioConfig: ScenarioConfig = loadScenarioConfig(),
): Promise<FastifyInstance> {
  const app = Fastify(options);
  const catalogService = createCatalogService(products);
  const scenarioRuntime = createScenarioRuntime(scenarioConfig);
  const requestEventLogging = registerRequestEventLogging(app, scenarioConfig);
  const markError = (request: FastifyRequest, errorCode: string): void => {
    requestEventLogging.markError(request, errorCode);
  };

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      markError(request, error.code);
      return reply.status(error.statusCode).send(error.toResponse());
    }

    request.log.error({ err: error }, 'Unhandled request error');
    markError(request, 'INTERNAL_SERVER_ERROR');
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

  registerCatalogRoutes(app, catalogService, scenarioRuntime, markError);
  await app.register(staticPlugin, {
    root: join(fileURLToPath(new URL('.', import.meta.url)), '../public'),
  });

  return app;
}
