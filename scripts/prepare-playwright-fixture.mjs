import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateDashboard } from '../dist/src/dashboard/dashboard.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(await readFile(resolve(root, 'fixtures/dashboard-analysis.json'), 'utf8'));
const outputDir = resolve(root, 'public/.qa-fixtures');
await mkdir(outputDir, { recursive: true });

const complete = { ...fixture, metrics: { ...fixture.metrics, timeSeries: [
  { timestamp: '2026-09-14T00:00:00.000Z', latencyMs: 0, errorCount: 0 },
  { timestamp: '2026-09-14T00:01:00.000Z', latencyMs: 25, errorCount: 1 },
] } };
const incomplete = { ...complete, status: 'incomplete', facts: { ...complete.facts, interrupted: true }, issues: [{ code: 'RUN_INCOMPLETE', message: 'The fixture was interrupted before all requests completed.' }], derivedFindings: [] };
const unavailable = fixture;
const zero = { ...fixture, status: 'incomplete', facts: { ...fixture.facts, requestCount: 0, successCount: 0, failureCount: 0, errorRate: 0, statusCodes: {}, errors: {}, interrupted: false }, metrics: { ...fixture.metrics, overall: { ...fixture.metrics.overall, requestCount: 0, successCount: 0, failureCount: 0, errorRate: 0, statusCodes: {}, errors: {}, throughputRequestsPerSecond: 0 }, byOperation: {}, timeSeries: [] }, issues: [{ code: 'EMPTY_REQUESTS', message: 'requests.jsonl contains no request records.' }], derivedFindings: [] };
for (const [name, report] of [['complete', complete], ['incomplete', incomplete], ['unavailable', unavailable], ['zero', zero]]) {
  const input = resolve(outputDir, `${name}.json`);
  await writeFile(input, JSON.stringify(report));
  await generateDashboard(input, resolve(outputDir, `${name}.html`));
}
const invalidInput = resolve(outputDir, 'invalid.json');
await writeFile(invalidInput, '{}');
await generateDashboard(invalidInput, resolve(outputDir, 'invalid.html'));
