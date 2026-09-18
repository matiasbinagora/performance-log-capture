import { execFile } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const metadataScript = resolve('scripts/write-playwright-metadata.mjs');
const workflowPath = resolve('.github/workflows/per-30-playwright-evidence.yml');
const pullRequestHeadSha = '1'.repeat(40);
const syntheticMergeSha = '2'.repeat(40);
const pushSha = '3'.repeat(40);

async function writeMetadata(env: Record<string, string | undefined>) {
  const cwd = await mkdtemp(join(tmpdir(), 'per-30-metadata-'));
  await execFileAsync(process.execPath, [metadataScript, '0'], {
    cwd,
    env: { ...process.env, ...env },
  });
  const metadata = JSON.parse(await readFile(join(cwd, 'playwright-artifacts/run-metadata.json'), 'utf8')) as { commit: string };
  return metadata.commit;
}

describe('PER-30 canonical Playwright commit selection', () => {
  it('uses the pull_request head SHA instead of the synthetic merge SHA', async () => {
    await expect(writeMetadata({
      PLAYWRIGHT_COMMIT: pullRequestHeadSha,
      GITHUB_SHA: syntheticMergeSha,
    })).resolves.toBe(pullRequestHeadSha);
  });

  it('uses the github.sha value supplied for non-pull-request execution', async () => {
    await expect(writeMetadata({
      PLAYWRIGHT_COMMIT: pushSha,
      GITHUB_SHA: pushSha,
    })).resolves.toBe(pushSha);
  });

  it('requires the workflow-provided canonical SHA', async () => {
    await expect(writeMetadata({ PLAYWRIGHT_COMMIT: undefined, GITHUB_SHA: syntheticMergeSha })).rejects.toThrow(
      'PLAYWRIGHT_COMMIT is required',
    );
    await expect(writeMetadata({ PLAYWRIGHT_COMMIT: 'not-a-sha', GITHUB_SHA: syntheticMergeSha })).rejects.toThrow(
      '40-character hexadecimal commit SHA',
    );
  });

  it('keeps workflow selection and artifact naming on the same canonical value', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    expect(workflow).toContain('PLAYWRIGHT_COMMIT: ${{ github.event.pull_request.head.sha || github.sha }}');
    expect(workflow).toContain('docker build --tag per-30-dashboard:${PLAYWRIGHT_COMMIT} .');
    expect(workflow).toContain('per-30-dashboard:${PLAYWRIGHT_COMMIT}');
    expect(workflow).toContain('name: PER-30-playwright-evidence-${{ env.PLAYWRIGHT_COMMIT }}');
  });
});
