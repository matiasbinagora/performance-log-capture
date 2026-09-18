import { mkdir, writeFile } from 'node:fs/promises';

const result = process.argv[2] ?? 'pending';
await mkdir('playwright-artifacts', { recursive: true });
const commit = process.env.GITHUB_SHA ?? process.env.PLAYWRIGHT_COMMIT ?? 'local';
await writeFile('playwright-artifacts/run-metadata.json', JSON.stringify({
  commit,
  workflow: process.env.GITHUB_WORKFLOW ?? 'local',
  runId: process.env.GITHUB_RUN_ID ?? 'local',
  runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? 'local',
  repository: process.env.GITHUB_REPOSITORY ?? 'local',
  ref: process.env.GITHUB_REF ?? 'local',
  browser: 'chromium',
  command: process.env.PLAYWRIGHT_COMMAND ?? 'npm run test:e2e',
  result,
}, null, 2) + '\n');
