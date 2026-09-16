import { promises as fs } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

import { calculateThroughput, checkApplication, DEFAULT_RUN_CONFIG, executeRun, RunConfigError, validateRunConfig } from '../src/performance/runner.js';

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

  it('rejects requested values above configured maxima before execution', () => {
    expect(() => validateRunConfig({ requests: 11, maxRequests: 10 })).toThrow('requests (11) must not exceed maxRequests (10)');
    expect(() => validateRunConfig({ concurrency: 6, maxConcurrency: 5 })).toThrow('concurrency (6) must not exceed maxConcurrency (5)');
    expect(() => validateRunConfig({ durationSeconds: 21, maxDurationSeconds: 20 })).toThrow('durationSeconds (21) must not exceed maxDurationSeconds (20)');
  });

  it('does not start execution for relationally invalid configuration', async () => {
    const fetcher = () => { throw new Error('execution must not start'); };
    const output = await fs.mkdtemp(join(tmpdir(), 'performance-agent-'));
    await expect(executeRun({ output, requests: 11, maxRequests: 10 }, { fetcher })).rejects.toThrow('must not exceed');
    expect(await fs.readdir(output)).toEqual([]);
  });

  it('accepts explicit configuration including the PER-25 scenario contract', () => {
    expect(validateRunConfig({
      baseUrl: 'http://127.0.0.1:3100', scenario: 'catalog', requests: 4, concurrency: 2,
      durationSeconds: 1, rampSeconds: 0, seed: 7, errorRate: 0.25, output: 'runs',
    })).toMatchObject({ baseUrl: 'http://127.0.0.1:3100', requests: 4, concurrency: 2, seed: 7, errorRate: 0.25, requestTimeoutMs: 10_000 });
  });

  it('supports a zero-request run with a finite serialized throughput', async () => {
    const output = await fs.mkdtemp(join(tmpdir(), 'performance-agent-'));
    const result = await executeRun({ output, requests: 0, durationSeconds: 1, rampSeconds: 0 }, { runId: 'empty-run', fetcher: () => Promise.resolve(response()) });
    const serialized = JSON.parse(await fs.readFile(join(result.runDirectory, 'summary.json'), 'utf8')) as typeof result.summary;
    expect(serialized.throughput).toEqual({ requestsPerSecond: 0 });
    expect(Number.isFinite(serialized.throughput.requestsPerSecond)).toBe(true);
    expect(calculateThroughput(0, 0)).toBe(0);
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

  it('creates nested output paths and preserves artifacts across unique runs', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'performance-agent-clean-'));
    const output = join(root, 'missing', 'nested', 'runs');
    const fetcher = () => Promise.resolve(response());

    const first = await executeRun({ output, requests: 1, concurrency: 1, durationSeconds: 1, rampSeconds: 0 }, { fetcher });
    const second = await executeRun({ output, requests: 1, concurrency: 1, durationSeconds: 1, rampSeconds: 0 }, { fetcher });

    expect(first.summary.status).toBe('complete');
    expect(second.summary.status).toBe('complete');
    expect(first.runId).not.toBe(second.runId);
    for (const result of [first, second]) {
      expect((await fs.stat(result.runDirectory)).isDirectory()).toBe(true);
      expect((await fs.readdir(result.runDirectory)).sort()).toEqual(['application.log', 'config.json', 'requests.jsonl', 'summary.json']);
      const summary = JSON.parse(await fs.readFile(join(result.runDirectory, 'summary.json'), 'utf8')) as typeof result.summary;
      expect(summary).toMatchObject({ status: 'complete', runId: result.runId, requestedRequests: 1, actualRequests: 1 });
      expect(typeof summary.throughput.requestsPerSecond).toBe('number');
      expect(Number.isFinite(summary.throughput.requestsPerSecond)).toBe(true);
    }
  });

  it('records deterministic simulated failures from the PER-25 response contract', async () => {
    const output = await fs.mkdtemp(join(tmpdir(), 'performance-agent-'));
    const fetcher = (url: string | URL | Request) => Promise.resolve(isSearch(url) ? response(503) : response());
    const result = await executeRun({ output, requests: 5, concurrency: 1, durationSeconds: 1, rampSeconds: 0 }, { fetcher });
    expect(result.summary.errorCount).toBeGreaterThan(0);
    expect(result.summary.errors.SEARCH_SIMULATED_ERROR).toBeGreaterThan(0);
  });

  it('aborts a hanging request at the configured timeout even with an external signal', async () => {
    const output = await fs.mkdtemp(join(tmpdir(), 'performance-agent-'));
    const controller = new AbortController();
    let calls = 0;
    const started = performance.now();
    const result = await executeRun({ output, requests: 1, durationSeconds: 1, rampSeconds: 0, requestTimeoutMs: 25 }, {
      signal: controller.signal,
      fetcher: (_url, init) => {
        calls += 1;
        if (calls === 1) return Promise.resolve(response());
        return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
      },
    });
    expect(performance.now() - started).toBeLessThan(500);
    expect(result.summary.errors.REQUEST_TIMEOUT).toBe(1);
    expect(result.summary.status).toBe('complete');
  });

  it('distinguishes external cancellation from a timeout and allows later requests to succeed', async () => {
    const output = await fs.mkdtemp(join(tmpdir(), 'performance-agent-'));
    const controller = new AbortController();
    let calls = 0;
    const result = await executeRun({ output, requests: 4, concurrency: 1, durationSeconds: 1, rampSeconds: 0, requestTimeoutMs: 100 }, {
      signal: controller.signal,
      fetcher: (_url, init) => {
        calls += 1;
        if (calls === 1) return Promise.resolve(response());
        if (calls === 2) {
          return new Promise<Response>((_resolve, reject) => {
            setTimeout(() => controller.abort(), 10);
            init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
          });
        }
        return Promise.resolve(response());
      },
    });
    expect(result.summary.errors.REQUEST_ABORTED).toBe(1);
    expect(result.summary.errors.REQUEST_TIMEOUT).toBeUndefined();
    expect(result.summary.throughput.requestsPerSecond).toBeGreaterThanOrEqual(0);
    expect(calls).toBe(2);
  });

  it('records stable throughput using the documented formula', () => {
    expect(calculateThroughput(20, 2_000)).toBe(10);
    expect(calculateThroughput(3, 1_000)).toBe(3);
    expect(calculateThroughput(3, 0)).toBe(0);
    expect(calculateThroughput(3, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('rejects unknown CLI flags before any execution', () => {
    expect(() => execFileSync(process.execPath, ['--import', 'tsx/esm', 'scripts/performance-run.ts', '--unknown', 'value'], { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' })).toThrow(/Unknown option '--unknown'/);
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
