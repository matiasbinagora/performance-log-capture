import { generateDashboard } from '../src/dashboard/dashboard.js';

const args = process.argv.slice(2);
const input = valueAfter('--input') ?? args[0];
const output = valueAfter('--output');

if (!input) {
  console.error('Usage: npm run dashboard:generate -- --input <analysis.json> [--output <dashboard.html>]');
  process.exit(2);
}

try {
  const result = await generateDashboard(input, output);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.status === 'complete' || result.status === 'incomplete' ? 0 : 2;
} catch (error) {
  console.error(`Dashboard generation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

function valueAfter(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}
