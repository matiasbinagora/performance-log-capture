import { promises as fs } from 'node:fs';
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
});
