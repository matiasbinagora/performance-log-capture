import { promises as fs } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { generateDashboard, renderDashboard, validateAnalysis, type DashboardAnalysis } from '../src/dashboard/dashboard.js';

const fixture = JSON.parse(await fs.readFile(new URL('../fixtures/dashboard-analysis.json', import.meta.url), 'utf8')) as Record<string, unknown>;

describe('standalone dashboard', () => {
  it('validates complete fixture and renders representative metrics safely', () => {
    const result = validateAnalysis(fixture);
    const html = renderDashboard(result.analysis, [], result.status);
    expect(result.status).toBe('complete');
    expect(html).toContain('Total requests');
    expect(html).toContain('Successful vs failed');
    expect(html).toContain('demo-run-42');
    expect(html).toContain('SEARCH_SIMULATED_ERROR');
    expect(html).toContain('standalone');
  });

  it('renders incomplete, zero-request, timeout and warnings without invented values', () => {
    const incomplete = { ...fixture, status: 'incomplete', facts: { ...(fixture.facts as Record<string, unknown>), requestCount: 0, successCount: 0, failureCount: 0, interrupted: true }, issues: [{ code: 'EMPTY_REQUESTS', message: 'requests.jsonl contains no request records.' }], derivedFindings: [] };
    const html = renderDashboard(incomplete as unknown as DashboardAnalysis, incomplete.issues, 'incomplete');
    expect(html).toContain('Incomplete data');
    expect(html).toContain('EMPTY_REQUESTS');
    expect(html).toContain('No derived findings are shown for incomplete data.');
    expect(html).toContain('No metrics were invented');
  });

  it('rejects invalid input and escapes untrusted values in rendered data', () => {
    expect(validateAnalysis({})).toMatchObject({ status: 'invalid' });
    const hostile = { ...fixture, runId: '<img src=x onerror=alert(1)>', derivedFindings: ['<script>alert(1)</script>'] };
    const html = renderDashboard(hostile as never);
    expect(html).toContain('\\u003cimg');
    expect(html).not.toContain('<img src=x');
  });

  it('rejects malformed shapes, invalid types, unsupported statuses, and contradictory artifacts', () => {
    const cases = [
      { value: { ...fixture, status: 'passing' }, code: 'UNSUPPORTED_STATUS' },
      { value: { ...fixture, runId: 42 }, code: 'INVALID_RUN_ID' },
      { value: { ...fixture, facts: { ...(fixture.facts as object), requestCount: '8' } }, code: 'INVALID_FIELD_TYPE' },
      { value: { ...fixture, files: { ...(fixture.files as object), 'summary.json': 'runs/other/summary.json' } }, code: 'ARTIFACT_RELATIONSHIP_MISMATCH' },
      { value: { ...fixture, metrics: { ...(fixture.metrics as object), overall: { ...((fixture.metrics as Record<string, unknown>).overall as object), failureCount: 1 } } }, code: 'INCONSISTENT_TOTAL' },
      { value: { ...fixture, config: { runId: 'other-run' } }, code: 'RUN_ID_MISMATCH' },
    ];
    for (const testCase of cases) expect(validateAnalysis(testCase.value).issues.map((issue) => issue.code)).toContain(testCase.code);
    expect(validateAnalysis({}).issues.map((issue) => issue.code)).toContain('MISSING_REQUIRED_FIELD');
  });

  it('never renders incomplete findings and distinguishes absent data from measured zero', () => {
    const incomplete = { ...fixture, status: 'incomplete', derivedFindings: [], facts: { ...(fixture.facts as Record<string, unknown>), requestCount: 1, successCount: 1, failureCount: 0, errorRate: 0 }, metrics: { ...(fixture.metrics as Record<string, unknown>), overall: { ...((fixture.metrics as Record<string, unknown>).overall as object), requestCount: 1, successCount: 1, failureCount: 0, errorRate: 0, statusCodes: { '200': 1 }, errors: {}, latencyMs: { average: 0, p50: 0, p95: 0, p99: 0, max: 0 }, throughputRequestsPerSecond: 1 }, byOperation: { health: { ...(((fixture.metrics as Record<string, unknown>).byOperation as Record<string, unknown>).health as object), requestCount: 1, successCount: 1, failureCount: 0, errorRate: 0, statusCodes: { '200': 1 }, errors: {}, latencyMs: { average: 0, p50: 0, p95: 0, p99: 0, max: 0 }, throughputRequestsPerSecond: 1 } } } };
    const stale = { ...incomplete, derivedFindings: ['must not be shown'] };
    const html = renderDashboard(stale as unknown as DashboardAnalysis, [], 'incomplete');
    expect(html).not.toContain('<li>must not be shown</li>');
    expect(html).toContain('insufficient timestamped data');
    expect(renderDashboard(fixture as unknown as DashboardAnalysis)).toContain('insufficient timestamped data');
  });

  it('renders real timestamped observations and preserves zero values', () => {
    const timestamped = { ...fixture, metrics: { ...(fixture.metrics as Record<string, unknown>), timeSeries: [{ timestamp: '2026-09-14T00:00:00.000Z', latencyMs: 0, errorCount: 0 }, { timestamp: '2026-09-14T00:01:00.000Z', latencyMs: 25, errorCount: 1 }] } };
    const result = validateAnalysis(timestamped);
    expect(result.status).toBe('complete');
    const html = renderDashboard(result.analysis, [], result.status);
    expect(html).toContain('earliest');
    expect(html).toContain('Errors over time');
    expect(html).toContain('Success versus failure');
  });

  it('returns the documented exit code for malformed CLI input', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'dashboard-invalid-'));
    const input = join(dir, 'broken.json');
    await fs.writeFile(input, '{broken');
    const result = spawnSync(process.execPath, ['--import', 'tsx/esm', 'scripts/performance-dashboard.ts', '--input', input, '--output', join(dir, 'dashboard.html')], { encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stdout).toContain('"status":"invalid"');
  });

  it('is deterministic and generates an offline artifact with no remote dependencies', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'dashboard-'));
    const input = join(dir, 'analysis.json'); const first = join(dir, 'one.html'); const second = join(dir, 'two.html');
    await fs.writeFile(input, JSON.stringify(fixture));
    await generateDashboard(input, first); await generateDashboard(input, second);
    const firstHtml = await fs.readFile(first, 'utf8');
    expect(firstHtml).toBe(await fs.readFile(second, 'utf8'));
    expect(firstHtml).toContain('<svg');
    expect(firstHtml).not.toMatch(/https?:\/\//);
    expect(firstHtml).not.toContain('<script src=');
  });
  it('distinguishes missing, null, invalid, zero and positive error counts', () => {
    const observation = (errorCount: unknown, include = true) => ({
      ...fixture,
      metrics: {
        ...(fixture.metrics as Record<string, unknown>),
        timeSeries: [include ? { timestamp: '2026-09-14T00:00:00.000Z', latencyMs: 0, ...(errorCount === undefined ? {} : { errorCount }) } : { timestamp: '2026-09-14T00:00:00.000Z', latencyMs: 0 }],
      },
    });
    expect(validateAnalysis(observation(undefined, false)).status).toBe('complete');
    expect(validateAnalysis(observation(null)).status).toBe('invalid');
    expect(validateAnalysis(observation('1')).status).toBe('invalid');
    expect(validateAnalysis(observation(0)).status).toBe('complete');
    expect(validateAnalysis(observation(2)).status).toBe('complete');

    expect(renderDashboard(observation(undefined, false) as unknown as DashboardAnalysis)).toContain('Unavailable');
    expect(renderDashboard(observation(0) as unknown as DashboardAnalysis)).toContain('0');
  });

  it('enforces deterministic zero-request error-rate semantics and unavailable operations', () => {
    const zeroReport = (errorRate: unknown) => ({
      ...fixture,
      status: 'incomplete',
      derivedFindings: [],
      hypotheses: [],
      facts: { ...(fixture.facts as Record<string, unknown>), requestCount: 0, successCount: 0, failureCount: 0, errorRate, statusCodes: {}, errors: {}, interrupted: false },
      metrics: {
        ...(fixture.metrics as Record<string, unknown>),
        overall: { ...((fixture.metrics as Record<string, unknown>).overall as object), requestCount: 0, successCount: 0, failureCount: 0, errorRate, statusCodes: {}, errors: {}, throughputRequestsPerSecond: 0 },
        byOperation: {},
        timeSeries: [{ timestamp: '2026-09-14T00:00:00.000Z', latencyMs: 0 }],
      },
    });
    expect(validateAnalysis(zeroReport(0)).status).toBe('incomplete');
    expect(validateAnalysis(zeroReport(0.5)).issues.map((issue) => issue.code)).toContain('INCONSISTENT_METRIC');

    const missingOperations = { ...fixture, metrics: { ...(fixture.metrics as Record<string, unknown>), byOperation: { health: ((fixture.metrics as Record<string, unknown>).byOperation as Record<string, unknown>).health } } };
    const html = renderDashboard(missingOperations as unknown as DashboardAnalysis);
    expect(html).toContain('unavailable-label');
    expect(html).toContain('Unavailable');
    expect(html).toContain("['detail','search']");
  });

  it('validates exact run directories, safe normalization, traversal, and nested artifacts', () => {
    const make = (inputDirectory: string, summaryPath: string, dashboardPath = 'runs/demo-run-42/dashboard.html') => ({
      ...fixture,
      inputDirectory,
      dashboardPath,
      files: { ...(fixture.files as Record<string, unknown>), 'summary.json': summaryPath },
    });
    const codes = (value: unknown) => validateAnalysis(value).issues.map((issue) => issue.code);

    expect(validateAnalysis(make('runs/demo-run-42', 'runs/demo-run-42/summary.json')).status).toBe('complete');
    expect(validateAnalysis(make('runs/./demo-run-42', 'runs\\demo-run-42\\nested\\summary.json', 'runs\\demo-run-42\\nested\\dashboard.html')).status).toBe('complete');
    expect(validateAnalysis(make('runs/demo-run-42', 'runs/demo-run-42/nested/output/summary.json')).status).toBe('complete');
    expect(codes(make('runs/demo-run-42-other', 'runs/demo-run-42-other/summary.json'))).toContain('RUN_ID_MISMATCH');
    expect(codes(make('runs/demo-run-42-extra', 'runs/demo-run-42-extra/summary.json'))).toContain('RUN_ID_MISMATCH');
    expect(codes(make('runs/demo-run-42', 'runs/demo-run-42/../demo-run-42-other/summary.json'))).toContain('ARTIFACT_RELATIONSHIP_MISMATCH');
    expect(codes(make('runs/demo-run-42', 'runs/demo-run-42/summary.json', 'runs/demo-run-42/../demo-run-42-other/dashboard.html'))).toContain('ARTIFACT_RELATIONSHIP_MISMATCH');
    expect(codes(make('runs/demo-run-42', 'runs/other/summary.json'))).toContain('ARTIFACT_RELATIONSHIP_MISMATCH');
    expect(codes(make('runs/demo-run-42', 'runs/demo-run-42/summary.json', 'runs/demo-run-42-other/dashboard.html'))).toContain('ARTIFACT_RELATIONSHIP_MISMATCH');
    expect(codes({ ...make('runs/demo-run-42', 'runs/demo-run-42/summary.json'), files: { ...(fixture.files as Record<string, unknown>), 'summary.json': '' } })).toContain('MISSING_REQUIRED_FIELD');
  });
});
