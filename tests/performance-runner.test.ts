import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

import { checkApplication, DEFAULT_RUN_CONFIG, executeRun, RunConfigError, validateRunConfig } from '../src/performance/runner.js';

function response(status = 200): Response {
  return new Response('{}', { status, headers: { 'content-type': 'application/json' } });
}

describe('performance runner', () => {
  it('applies safe defaults and rejects unsafe limits', () => {
    expect(validateRunConfig({})).toEqual(DEFAULT_RUN_CONFIG);
    expect(() => validateRunConfig({ requests: 100_001 })).toThrow(RunConfigError);
    expect(() => validateRunConfig({ concurrency: 0 })).toThrow(RunConfigError);
    expect(() => validateRunConfig({ durationSeconds: 3_601 })).toThrow(RunConfigError);
  });

  it('accepts explicit configuration including the PER-25 scenario contract', () => {
    expect(validateRunConfig({
      baseUrl: 'http://127.0.0.1:3100', scenario: 'catalog', requests: 4, concurrency: 2,
      durationSeconds: 1, rampSeconds: 0, seed: 7, errorRate: 0.25, output: 'runs',
    })).toMatchObject({ baseUrl: 'http://127.0.0.1:3100', requests: 4, concurrency: 2, seed: 7, errorRate: 0.25 });
  });

  it('stops before creating a run when the application is unavailable', async () => {
    const output = await fs.mkdtemp(join(tmpdir(), 'performance-agent-'));
    await expect(checkApplication('http://localhost:9', () => Promise.reject(new Error('connection refused')))).rejects.toThrow('Application prerequisite failed');
    await expect(executeRun({ output, requests: 1, durationSeconds: 1, rampSeconds: 0 }, { fetcher: () => Promise.reject(new Error('connection refused')) })).rejects.toThrow('Application prerequisite failed');
    expect(await fs.readdir(output)).toEqual([]);
  });

  it('writes machine-readable artifacts and accurate summary for a smoke run', async () => {
    const output = await fs.mkdtemp(join(tmpdir(), 'performance-agent-'));
    const result = await executeRun({ output, requests: 8, concurrency: 3, durationSeconds: 1, rampSeconds: 0, errorRate: 0 }, {
      runId: 'smoke-run',
      fetcher: (url) => Promise.resolve(isSearch(url) ? response(200) : response()),
    });
    const files = await fs.readdir(result.runDirectory);
    expect(files.sort()).toEqual(['application.log', 'config.json', 'requests.jsonl', 'summary.json']);
    expect(result.summary).toMatchObject({ status: 'complete', runId: 'smoke-run', requestedRequests: 8, actualRequests: 8, errorCount: 0 });
    const events = (await fs.readFile(join(result.runDirectory, 'requests.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line) as { requestId: string; runId: string });
    expect(events).toHaveLength(8);
    expect(new Set(events.map((event) => event.requestId)).size).toBe(8);
    expect(events.every((event) => event.runId === 'smoke-run')).toBe(true);
  });

  it('records deterministic simulated failures from the PER-25 response contract', async () => {
    const output = await fs.mkdtemp(join(tmpdir(), 'performance-agent-'));
    const fetcher = (url: string | URL | Request) => Promise.resolve(isSearch(url) ? response(503) : response());
    const result = await executeRun({ output, requests: 5, concurrency: 1, durationSeconds: 1, rampSeconds: 0 }, { fetcher });
    expect(result.summary.errorCount).toBeGreaterThan(0);
    expect(result.summary.errors.SEARCH_SIMULATED_ERROR).toBeGreaterThan(0);
  });

  it('marks a signal-interrupted run incomplete', async () => {
    const output = await fs.mkdtemp(join(tmpdir(), 'performance-agent-'));
    const controller = new AbortController();
    let calls = 0;
    const resultPromise = executeRun({ output, requests: 10, concurrency: 1, durationSeconds: 10, rampSeconds: 0 }, {
      signal: controller.signal,
      fetcher: (url) => { calls += 1; if (!isHealth(url)) controller.abort(); return Promise.resolve(response()); },
    });
    const result = await resultPromise;
    expect(calls).toBe(2);
    expect(result.summary.status).toBe('incomplete');
    expect(result.summary.actualRequests).toBe(1);
    expect(result.summary.status).not.toBe('complete');
  });
});

function isSearch(url: string | URL | Request): boolean {
  return typeof url === 'string' ? url.includes('/search') : url instanceof URL ? url.pathname.includes('/search') : url.url.includes('/search');
}

function isHealth(url: string | URL | Request): boolean {
  return typeof url === 'string' ? url.includes('/health') : url instanceof URL ? url.pathname.includes('/health') : url.url.includes('/health');
}
