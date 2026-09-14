import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { analyzeRun } from '../src/analysis/log-analyzer.js';

const event = (runId: string, requestId: string, operation: string, status: number, duration: number, errorCode?: string) => ({ runId, requestId, operation, status, duration, timestamp: `2026-09-14T00:00:0${requestId.slice(-1)}.000Z`, ...(errorCode ? { errorCode } : {}) });

async function fixture(events: unknown[], summary: Partial<Record<string, unknown>> = {}, files: string[] = ['config.json', 'requests.jsonl', 'application.log', 'summary.json']): Promise<string> {
  const directory = await fs.mkdtemp(join(tmpdir(), 'log-analysis-')); const runId = 'run-fixture';
  if (files.includes('config.json')) await fs.writeFile(join(directory, 'config.json'), JSON.stringify({ runId, scenario: 'catalog' }));
  if (files.includes('requests.jsonl')) await fs.writeFile(join(directory, 'requests.jsonl'), events.map((item) => JSON.stringify(item)).join('\n') + (events.length ? '\n' : ''));
  if (files.includes('application.log')) await fs.writeFile(join(directory, 'application.log'), '');
  if (files.includes('summary.json')) await fs.writeFile(join(directory, 'summary.json'), JSON.stringify({ schemaVersion: 1, status: 'complete', runId, actualRequests: events.length, durationMs: 1_000, ...summary }));
  return directory;
}

describe('log analyzer', () => {
  it('aggregates complete artifacts by operation and keeps source-traceable examples', async () => {
    const directory = await fixture([
      event('run-fixture', 'req-1', 'product_detail', 200, 10), event('run-fixture', 'req-2', 'product_search', 200, 250),
      event('run-fixture', 'req-3', 'product_search', 503, 300, 'SEARCH_SIMULATED_ERROR'), event('run-fixture', 'req-4', 'health', 200, 5),
    ]);
    const result = await analyzeRun(directory);
    expect(result.status).toBe('complete'); expect(result.facts).toMatchObject({ requestCount: 4, successCount: 3, failureCount: 1, errorRate: 0.25 });
    expect(result.metrics.byOperation.product_search).toMatchObject({ requestCount: 2, failureCount: 1, errors: { SEARCH_SIMULATED_ERROR: 1 }, latencyMs: { average: 275, p50: 250, p95: 300, p99: 300, max: 300 }, throughputRequestsPerSecond: 2 });
    expect(result.derivedFindings.join(' ')).toContain('product_search is the slowest'); expect(result.examples.errors[0]).toMatchObject({ source: { file: 'requests.jsonl', line: 3 } });
  });

  it('rejects empty, malformed, incomplete, duplicate, and cross-run records explicitly', async () => {
    const directory = await fixture([event('run-fixture', 'req-1', 'product_search', 200, 5), event('other-run', 'req-2', 'product_detail', 200, 5), event('run-fixture', 'req-1', 'health', 200, 1)], { actualRequests: 3 });
    await fs.appendFile(join(directory, 'requests.jsonl'), '{broken\n'); const result = await analyzeRun(directory);
    expect(result.status).toBe('incomplete'); expect(result.derivedFindings).toEqual([]); expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['RUN_ID_MISMATCH', 'DUPLICATE_REQUEST_ID', 'MALFORMED_JSONL']));
    const empty = await fixture([]); const emptyResult = await analyzeRun(empty); expect(emptyResult.status).toBe('incomplete'); expect(emptyResult.issues.map((issue) => issue.code)).toContain('EMPTY_REQUESTS');
    const missing = await fixture([], {}, ['config.json', 'summary.json']); const missingResult = await analyzeRun(missing); expect(missingResult.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['MISSING_FILE']));
  });

  it('is deterministic and reports interruption without conclusions', async () => {
    const directory = await fixture([event('run-fixture', 'req-1', 'product_search', 200, 250)], { actualRequests: 1, status: 'incomplete' });
    const first = await analyzeRun(directory); const second = await analyzeRun(directory); expect(first).toEqual(second); expect(first.facts.interrupted).toBe(true); expect(first.derivedFindings).toEqual([]);
  });

  it('processes a large JSONL input with bounded latency sampling', async () => {
    const events = Array.from({ length: 10_050 }, (_, index) => event('run-fixture', `req-${index}`, 'product_search', 200, index));
    const directory = await fixture(events);
    const result = await analyzeRun(directory);
    expect(result.status).toBe('complete'); expect(result.facts.requestCount).toBe(10_050); expect(result.metrics.overall.latencyMs.average).toBe(5_024.5); expect(result.metrics.overall.latencyMs.max).toBe(10_049);
  });
});
