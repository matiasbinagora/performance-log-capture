import { createWriteStream, promises as fs } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

export const DEFAULT_RUN_CONFIG = {
  baseUrl: 'http://localhost:3000',
  scenario: 'catalog',
  requests: 20_000,
  concurrency: 20,
  durationSeconds: 60,
  rampSeconds: 10,
  seed: 42,
  errorRate: 0.02,
  requestTimeoutMs: 10_000,
  output: 'runs',
  maxRequests: 100_000,
  maxConcurrency: 200,
  maxDurationSeconds: 3_600,
} as const;

export interface RunConfig {
  readonly baseUrl: string;
  readonly scenario: 'catalog';
  readonly requests: number;
  readonly concurrency: number;
  readonly durationSeconds: number;
  readonly rampSeconds: number;
  readonly seed: number;
  readonly errorRate: number;
  readonly requestTimeoutMs: number;
  readonly output: string;
  readonly maxRequests: number;
  readonly maxConcurrency: number;
  readonly maxDurationSeconds: number;
}

export interface RequestEvent {
  readonly runId: string;
  readonly requestId: string;
  readonly operation: 'health' | 'product_detail' | 'product_search';
  readonly status: number;
  readonly duration: number;
  readonly timestamp: string;
  readonly errorCode?: string;
}

export interface RunSummary {
  readonly schemaVersion: 1;
  readonly status: 'complete' | 'incomplete';
  readonly runId: string;
  readonly requestedRequests: number;
  readonly actualRequests: number;
  readonly durationMs: number;
  readonly operationDistribution: Record<string, number>;
  readonly successCount: number;
  readonly errorCount: number;
  readonly errorRate: number;
  readonly throughput: { readonly requestsPerSecond: number };
  readonly latencyMs: { readonly average: number; readonly p50: number; readonly p95: number; readonly p99: number; readonly max: number };
  readonly errors: Record<string, number>;
  readonly generatedAt: string;
}

export interface RunResult {
  readonly runId: string;
  readonly runDirectory: string;
  readonly summary: RunSummary;
}

export class RunConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RunConfigError';
  }
}

export function validateRunConfig(input: Partial<RunConfig>): RunConfig {
  const config = { ...DEFAULT_RUN_CONFIG, ...input };
  if (config.scenario !== 'catalog') throw new RunConfigError("scenario must be 'catalog'.");
  if (!/^https?:\/\/[^\s]+$/.test(config.baseUrl)) throw new RunConfigError('baseUrl must be an HTTP(S) URL.');
  integer(config.requests, 0, config.maxRequests, 'requests');
  integer(config.concurrency, 1, config.maxConcurrency, 'concurrency');
  integer(config.durationSeconds, 1, config.maxDurationSeconds, 'durationSeconds');
  integer(config.rampSeconds, 0, config.durationSeconds, 'rampSeconds');
  integer(config.maxRequests, 1, 100_000, 'maxRequests');
  integer(config.maxConcurrency, 1, 1_000, 'maxConcurrency');
  integer(config.maxDurationSeconds, 1, 3_600, 'maxDurationSeconds');
  integer(config.requestTimeoutMs, 1, 3_600_000, 'requestTimeoutMs');
  integer(config.seed, -2_147_483_648, 2_147_483_647, 'seed');
  if (!Number.isFinite(config.errorRate) || config.errorRate < 0 || config.errorRate > 1) {
    throw new RunConfigError('errorRate must be between 0 and 1.');
  }
  if (!config.output.trim()) throw new RunConfigError('output must not be empty.');
  return config;
}

function integer(value: number, minimum: number, maximum: number, name: string): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RunConfigError(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
}

export async function checkApplication(baseUrl: string, fetcher: typeof fetch = fetch): Promise<void> {
  try {
    const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error(`health returned HTTP ${response.status}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Application prerequisite failed: ${message}`, { cause: error });
  }
}

export async function executeRun(
  rawConfig: Partial<RunConfig>,
  options: { runId?: string; fetcher?: typeof fetch; onProgress?: (completed: number, target: number) => void; signal?: AbortSignal } = {},
): Promise<RunResult> {
  const config = validateRunConfig(rawConfig);
  const fetcher = options.fetcher ?? fetch;
  await checkApplication(config.baseUrl, fetcher);
  const runId = options.runId ?? createRunId();
  const runDirectory = await createRunDirectory(config.output, runId);
  const startedAt = performance.now();
  const requestStream = createWriteStream(join(runDirectory, 'requests.jsonl'), { encoding: 'utf8' });
  const applicationLog = createWriteStream(join(runDirectory, 'application.log'), { encoding: 'utf8' });
  await fs.writeFile(join(runDirectory, 'config.json'), `${JSON.stringify({ ...config, runId, host: hostname() }, null, 2)}\n`);

  let nextRequest = 0;
  let completed = 0;
  let interrupted = false;
  const events: RequestEvent[] = [];
  const operations = { health: 0, product_detail: 0, product_search: 0 };
  const errors: Record<string, number> = {};
  const latencies: number[] = [];
  const deadline = startedAt + config.durationSeconds * 1_000;
  const abort = () => { interrupted = true; };
  options.signal?.addEventListener('abort', abort, { once: true });

  const runRequest = async (requestNumber: number): Promise<void> => {
    const scheduledAt = startedAt + ((requestNumber - 1) / config.requests) * config.durationSeconds * 1_000;
    if (scheduledAt > performance.now()) await wait(scheduledAt - performance.now());
    const operation = operationFor(requestNumber, config.seed);
    const url = requestUrl(config.baseUrl, operation);
    const requestStarted = performance.now();
    let status = 0;
    let errorCode: string | undefined;
    try {
      const response = await fetchWithTimeout(fetcher, url, options.signal, config.requestTimeoutMs);
      status = response.status;
      if (!response.ok) errorCode = status === 503 ? 'SEARCH_SIMULATED_ERROR' : `HTTP_${status}`;
    } catch (error) {
      errorCode = error instanceof RequestTimeoutError ? 'REQUEST_TIMEOUT' : error instanceof RequestCancelledError ? 'REQUEST_ABORTED' : 'REQUEST_FAILED';
    }
    const duration = Math.max(0, Math.round(performance.now() - requestStarted));
    const event: RequestEvent = { runId, requestId: `${runId}-${requestNumber}`, operation, status, duration, timestamp: new Date().toISOString(), ...(errorCode ? { errorCode } : {}) };
    events.push(event);
    requestStream.write(`${JSON.stringify(event)}\n`);
    applicationLog.write(`${JSON.stringify(event)}\n`);
    operations[operation] += 1;
    latencies.push(duration);
    if (errorCode) errors[errorCode] = (errors[errorCode] ?? 0) + 1;
    completed += 1;
    options.onProgress?.(completed, config.requests);
  };

  try {
    const workers = Array.from({ length: Math.min(config.concurrency, config.requests) }, async (_value, workerIndex) => {
      const rampDelay = config.rampSeconds * 1_000 * workerIndex / Math.max(1, config.concurrency);
      if (rampDelay > 0) await wait(rampDelay);
      while (!interrupted && !options.signal?.aborted && nextRequest < config.requests && performance.now() <= deadline) {
        const requestNumber = ++nextRequest;
        await runRequest(requestNumber);
      }
    });
    await Promise.all(workers);
  } finally {
    interrupted ||= Boolean(options.signal?.aborted) || nextRequest < config.requests;
    applicationLog.write(`${new Date().toISOString()} ${interrupted ? 'incomplete' : 'complete'} requests=${completed}/${config.requests}\n`);
    await Promise.all([
      new Promise<void>((resolve) => requestStream.end(resolve)),
      new Promise<void>((resolve) => applicationLog.end(resolve)),
    ]);
    options.signal?.removeEventListener('abort', abort);
  }

  const durationMs = Math.round(performance.now() - startedAt);
  const summary: RunSummary = {
    schemaVersion: 1,
    status: interrupted ? 'incomplete' : 'complete',
    runId,
    requestedRequests: config.requests,
    actualRequests: events.length,
    durationMs,
    operationDistribution: operations,
    successCount: events.filter((event) => event.errorCode === undefined && event.status >= 200 && event.status < 400).length,
    errorCount: events.filter((event) => event.errorCode !== undefined || event.status >= 400).length,
    errorRate: events.length === 0 ? 0 : Number((events.filter((event) => event.errorCode !== undefined || event.status >= 400).length / events.length).toFixed(4)),
    throughput: { requestsPerSecond: calculateThroughput(events.length, durationMs) },
    latencyMs: percentileSummary(latencies),
    errors,
    generatedAt: new Date().toISOString(),
  };
  await fs.writeFile(join(runDirectory, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  return { runId, runDirectory, summary };
}

export class RequestTimeoutError extends Error {
  constructor() { super('Request exceeded the configured timeout.'); this.name = 'RequestTimeoutError'; }
}

export class RequestCancelledError extends Error {
  constructor() { super('Request was cancelled by the caller.'); this.name = 'RequestCancelledError'; }
}

export function calculateThroughput(requestCount: number, durationMs: number): number {
  if (requestCount <= 0 || durationMs <= 0 || !Number.isFinite(durationMs)) return 0;
  return Number((requestCount / (durationMs / 1_000)).toFixed(2));
}

async function fetchWithTimeout(fetcher: typeof fetch, url: string, externalSignal: AbortSignal | undefined, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  let cancelled = Boolean(externalSignal?.aborted);
  const cancel = () => { cancelled = true; controller.abort(); };
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  externalSignal?.addEventListener('abort', cancel, { once: true });
  try {
    if (cancelled) throw new RequestCancelledError();
    const response = await fetcher(url, { signal: controller.signal });
    await response.arrayBuffer();
    return response;
  } catch (error) {
    if (timedOut) throw new RequestTimeoutError();
    if (cancelled) throw new RequestCancelledError();
    throw error;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', cancel);
  }
}

async function createRunDirectory(output: string, runId: string): Promise<string> {
  const directory = join(output, runId);
  await fs.mkdir(directory, { recursive: false }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'EEXIST') throw error;
    throw new RunConfigError(`Run directory already exists: ${directory}`);
  });
  return directory;
}

function createRunId(): string {
  return `run-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${process.pid}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
}

function operationFor(requestNumber: number, seed: number): RequestEvent['operation'] {
  const sample = ((Math.imul(seed | 0, 1_103_515_245) + Math.imul(requestNumber, 12_345) + 12_345) >>> 0) / 4_294_967_296;
  if (sample < 0.1) return 'health';
  if (sample < 0.3) return 'product_detail';
  return 'product_search';
}

function requestUrl(baseUrl: string, operation: RequestEvent['operation']): string {
  const root = baseUrl.replace(/\/$/, '');
  if (operation === 'health') return `${root}/health`;
  if (operation === 'product_detail') return `${root}/products/aurora-desk-lamp`;
  return `${root}/products/search?q=desk`;
}

function percentileSummary(values: number[]): RunSummary['latencyMs'] {
  if (values.length === 0) return { average: 0, p50: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const pick = (percentile: number) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentile) - 1)] ?? 0;
  return { average: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)), p50: pick(0.5), p95: pick(0.95), p99: pick(0.99), max: sorted[sorted.length - 1] ?? 0 };
}

function wait(milliseconds: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
