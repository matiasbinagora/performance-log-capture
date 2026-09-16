import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function runCli(input: string, output: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/log-analysis.ts', '--input', input, '--output', output], { cwd: process.cwd() });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

describe('log analysis CLI validation contract', () => {
  it('returns exit 2 and writes no misleading complete artifact for relational violations', async () => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'log-analysis-cli-')); const output = join(directory, 'analysis.json'); const runId = 'run-cli';
    const config = { runId, baseUrl: 'http://localhost:3000', scenario: 'catalog', requests: 11, concurrency: 6, durationSeconds: 21, rampSeconds: 10, seed: 42, errorRate: 0.02, output: 'runs', maxRequests: 10, maxConcurrency: 5, maxDurationSeconds: 20 };
    const event = { runId, requestId: `${runId}-1`, operation: 'product_search', status: 200, duration: 10, timestamp: '2026-09-14T00:00:00.000Z' };
    await fs.writeFile(join(directory, 'config.json'), JSON.stringify(config));
    await fs.writeFile(join(directory, 'requests.jsonl'), `${JSON.stringify(event)}\n`);
    await fs.writeFile(join(directory, 'application.log'), '');
    await fs.writeFile(join(directory, 'summary.json'), JSON.stringify({ schemaVersion: 1, status: 'complete', runId, actualRequests: 1, durationMs: 1_000 }));
    const result = await runCli(directory, output); const artifact = JSON.parse(await fs.readFile(output, 'utf8')) as { status: string; derivedFindings: unknown[]; issues: Array<{ code: string }> };
    expect(result.code).toBe(2); expect(result.stdout).toContain('CONFIG_RELATIONAL_LIMIT'); expect(artifact.status).toBe('incomplete'); expect(artifact.derivedFindings).toEqual([]); expect(artifact.issues.filter((issue) => issue.code === 'CONFIG_RELATIONAL_LIMIT')).toHaveLength(3);
  });
});
