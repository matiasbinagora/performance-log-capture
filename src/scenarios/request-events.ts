import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ScenarioConfig } from './scenario-config.js';

interface RequestEventContext { readonly requestId: string; readonly startedAt: number; readonly operation: 'health' | 'product_detail' | 'product_search' | 'unknown'; errorCode?: string; }

export function registerRequestEventLogging(app: FastifyInstance, config: ScenarioConfig): { markError(request: FastifyRequest, errorCode: string): void } {
  const contexts = new WeakMap<object, RequestEventContext>();
  let requestNumber = 0;
  app.addHook('onRequest', (request, _reply, done) => {
    requestNumber += 1;
    contexts.set(request, { requestId: `${config.runId}-${requestNumber}`, startedAt: Date.now(), operation: operationFor(request) });
    done();
  });
  app.addHook('onResponse', (request, reply, done) => {
    const context = contexts.get(request);
    if (context) {
      const event = { runId: config.runId, requestId: context.requestId, operation: context.operation, status: reply.statusCode, duration: Date.now() - context.startedAt, timestamp: new Date().toISOString(), ...(context.errorCode ? { errorCode: context.errorCode } : {}) };
      process.stdout.write(`${JSON.stringify(event)}\n`);
      contexts.delete(request);
    }
    done();
  });
  return { markError: (request, errorCode) => { const context = contexts.get(request); if (context) context.errorCode = errorCode; } };
}

function operationFor(request: FastifyRequest): RequestEventContext['operation'] {
  if (request.url === '/health') return 'health';
  if (request.url.startsWith('/products/search')) return 'product_search';
  if (request.url.startsWith('/products/')) return 'product_detail';
  return 'unknown';
}
