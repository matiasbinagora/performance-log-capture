import { mkdir, writeFile } from 'node:fs/promises';

const result = process.argv[2] ?? 'pending';
await mkdir('playwright-artifacts', { recursive: true });
await writeFile('playwright-artifacts/run-metadata.json', JSON.stringify({
  commit: process.env.GITHUB_SHA ?? 'local',
  browser: 'chromium',
  command: process.env.PLAYWRIGHT_COMMAND ?? 'npm run test:e2e',
  result,
}, null, 2) + '\n');
