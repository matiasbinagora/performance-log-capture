import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { analyzeRun } from '../src/analysis/log-analyzer.js';

const event = (runId: string, requestId: string, operation = 'product_search', status = 200, duration = 10, errorCode?: string) => ({ runId, requestId, operation, status, duration, timestamp: '2026-09-14T00:00:00.000Z', ...(errorCode ? { errorCode } : {}) });
async function fixture(events: unknown[], config: Record<string, unknown> | string = {}, summary: Record<string, unknown> = {}, log = ''): Promise<string> {
  const directory = await fs.mkdtemp(join(tmpdir(), 'log-analysis-')); const runId = 'run-fixture';
  const validConfig = { runId, baseUrl: 'http://localhost:3000', scenario: 'catalog', requests: 20_000, concurrency: 20, durationSeconds: 60, rampSeconds: 10, seed: 42, errorRate: 0.02, output: 'runs', maxRequests: 100_000, maxConcurrency: 200, maxDurationSeconds: 3_600, ...(typeof config === 'string' ? {} : config) };
  await fs.writeFile(join(directory, 'config.json'), typeof config === 'string' ? config : JSON.stringify(validConfig));
  await fs.writeFile(join(directory, 'requests.jsonl'), events.map((item) => JSON.stringify(item)).join('\n') + (events.length ? '\n' : ''));
  await fs.writeFile(join(directory, 'application.log'), log);
  await fs.writeFile(join(directory, 'summary.json'), JSON.stringify({ schemaVersion: 1, status: 'complete', runId, actualRequests: events.length, durationMs: 1_000, ...summary }));
  return directory;
}

describe('log analyzer validation and metrics', () => {
  it('rejects empty config and missing required fields', async () => {
    const empty = await fixture([event('run-fixture', 'req-1')], '{}'); const emptyResult = await analyzeRun(empty);
    expect(emptyResult.status).toBe('incomplete'); expect(emptyResult.issues.map((issue) => issue.code)).toContain('CONFIG_MISSING_FIELD'); expect(emptyResult.derivedFindings).toEqual([]);
    const missing = await fixture([event('run-fixture', 'req-1')], JSON.stringify({ runId: 'run-fixture' })); const missingResult = await analyzeRun(missing);
    expect(missingResult.status).toBe('incomplete'); expect(missingResult.issues.some((issue) => issue.code === 'CONFIG_MISSING_FIELD')).toBe(true);
  });

  it('rejects malformed JSON, invalid types, and unsupported bounds', async () => {
    const malformed = await fixture([event('run-fixture', 'req-1')], '{'); expect((await analyzeRun(malformed)).issues.map((issue) => issue.code)).toContain('MALFORMED_JSON');
    const invalidConfig = { runId: 'run-fixture', baseUrl: 'http://localhost:3000', scenario: 'other', requests: 0, concurrency: '20', durationSeconds: null, rampSeconds: 10, seed: 42, errorRate: 2, output: 'runs', maxRequests: 100_000, maxConcurrency: 200, maxDurationSeconds: 3_600 };
    const invalid = await fixture([event('run-fixture', 'req-1')], JSON.stringify(invalidConfig)); const result = await analyzeRun(invalid);
    expect(result.status).toBe('incomplete'); expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['CONFIG_OUT_OF_RANGE', 'CONFIG_INVALID_FIELD', 'CONFIG_UNSUPPORTED_SCENARIO'])); expect(result.status).not.toBe('complete');
  });

  it('rejects every relational limit violation, including simultaneous violations', async () => {
    for (const [field, maximum, value] of [
      ['requests', 'maxRequests', 21],
      ['concurrency', 'maxConcurrency', 6],
      ['durationSeconds', 'maxDurationSeconds', 61],
    ] as const) {
      const directory = await fixture([event('run-fixture', 'req-1')], { [field]: value, [maximum]: value - 1 });
      const result = await analyzeRun(directory);
      expect(result.status).toBe('incomplete');
      expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CONFIG_RELATIONAL_LIMIT' })]));
      expect(result.issues.some((issue) => issue.message.includes(field) && issue.message.includes(maximum))).toBe(true);
      expect(result.derivedFindings).toEqual([]);
    }

    const multiple = await fixture([event('run-fixture', 'req-1')], {
      requests: 21, maxRequests: 20, concurrency: 6, maxConcurrency: 5, durationSeconds: 61, maxDurationSeconds: 60,
    });
    const result = await analyzeRun(multiple);
    expect(result.status).toBe('incomplete');
    expect(result.issues.filter((issue) => issue.code === 'CONFIG_RELATIONAL_LIMIT')).toHaveLength(3);
    expect(result.derivedFindings).toEqual([]);
  });

  it('accepts values equal to and below each configured maximum', async () => {
    for (const values of [
      { requests: 20, maxRequests: 20, concurrency: 5, maxConcurrency: 5, durationSeconds: 60, maxDurationSeconds: 60 },
      { requests: 19, maxRequests: 20, concurrency: 4, maxConcurrency: 5, durationSeconds: 59, maxDurationSeconds: 60 },
    ]) {
      const directory = await fixture([event('run-fixture', 'req-1')], values);
      const result = await analyzeRun(directory);
      expect(result.status).toBe('complete');
      expect(result.issues).toEqual([]);
    }
  });

  it('rejects config/summary, request/config, and application-log run-ID mismatches', async () => {
    const configMismatch = await fixture([event('run-summary', 'req-1')], { runId: 'run-config' }, { runId: 'run-summary' }); const first = await analyzeRun(configMismatch);
    expect(first.status).toBe('incomplete'); expect(first.issues.some((issue) => issue.code === 'RUN_ID_MISMATCH')).toBe(true);
    const artifactMismatch = await fixture([event('run-fixture', 'req-1')], {}, {}, JSON.stringify(event('other-run', 'log-1')) + '\n'); const second = await analyzeRun(artifactMismatch);
    expect(second.status).toBe('incomplete'); expect(second.issues.some((issue) => issue.code === 'RUN_ID_MISMATCH')).toBe(true); expect(second.derivedFindings).toEqual([]);
  });

  it('accepts a valid matching artifact set and remains deterministic', async () => {
    const directory = await fixture([event('run-fixture', 'req-1', 'product_detail', 200, 10), event('run-fixture', 'req-2', 'product_search', 200, 250), event('run-fixture', 'req-3', 'product_search', 503, 300, 'SEARCH_SIMULATED_ERROR')]);
    const first = await analyzeRun(directory); const second = await analyzeRun(directory);
    expect(first).toEqual(second); expect(first.status).toBe('complete'); expect(first.facts.requestCount).toBe(3); expect(first.facts.failureCount).toBe(1); expect(first.derivedFindings.join(' ')).toContain('product_search is the slowest');
  });

  it('keeps filesystem reads absolute while serializing safe repository-relative artifact references', async () => {
    const directory = await fixture([event('run-fixture', 'req-1')]);
    const graphifyEvidence = join(directory, 'graphify-search.txt');
    await fs.writeFile(graphifyEvidence, 'source evidence');
    const result = await analyzeRun(directory, { graphifyEvidencePath: graphifyEvidence });

    expect(result.inputDirectory).toBe('runs/run-fixture');
    expect(result.files).toEqual({
      'config.json': 'runs/run-fixture/config.json',
      'requests.jsonl': 'runs/run-fixture/requests.jsonl',
      'application.log': 'runs/run-fixture/application.log',
      'summary.json': 'runs/run-fixture/summary.json',
    });
    expect(result.dashboardPath).toBe('runs/run-fixture/dashboard.html');
    expect(result.graphify).toMatchObject({ status: 'available', evidencePath: null });
    expect(JSON.stringify(result)).not.toContain(directory);
    expect(JSON.stringify(result)).not.toContain(graphifyEvidence);
  });

  it('normalizes repository-local Graphify evidence without exposing its absolute path', async () => {
    const directory = await fixture([event('run-fixture', 'req-1')]);
    const graphifyEvidence = join(process.cwd(), 'graphify-out', 'evidence', 'regression.txt');
    await fs.mkdir(join(process.cwd(), 'graphify-out', 'evidence'), { recursive: true });
    await fs.writeFile(graphifyEvidence, 'source evidence');
    try {
      const result = await analyzeRun(directory, { graphifyEvidencePath: graphifyEvidence });
      expect(result.graphify).toMatchObject({ status: 'available', evidencePath: 'graphify-out/evidence/regression.txt' });
      expect(JSON.stringify(result)).not.toContain(graphifyEvidence);
    } finally {
      await fs.rm(graphifyEvidence, { force: true });
    }
  });

  it('keeps bounded streaming metrics and excludes invalid records from conclusions', async () => {
    const events = Array.from({ length: 10_050 }, (_, index) => event('run-fixture', `req-${index}`, 'product_search', 200, index)); const directory = await fixture(events); const result = await analyzeRun(directory);
    expect(result.status).toBe('complete'); expect(result.facts.requestCount).toBe(10_050); expect(result.metrics.overall.latencyMs.max).toBe(10_049);
    await fs.appendFile(join(directory, 'requests.jsonl'), '{broken\n'); const invalid = await analyzeRun(directory); expect(invalid.status).toBe('incomplete'); expect(invalid.derivedFindings).toEqual([]);
  });
});
