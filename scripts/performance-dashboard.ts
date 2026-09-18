import { generateDashboard } from '../src/dashboard/dashboard.js';

const args = process.argv.slice(2);
let input: string | undefined;
let output: string | undefined;
try {
  const parsed = parseArgs(args);
  input = parsed.input;
  output = parsed.output;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

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

function parseArgs(values: string[]): { input?: string; output?: string } {
  const result: { input?: string; output?: string } = {};
  let start = 0;
  if (values[0] && !values[0].startsWith('--')) { result.input = values[0]; start = 1; }
  for (let index = start; index < values.length; index += 1) {
    const flag = values[index];
    if (flag === undefined || !flag.startsWith('--')) throw new Error(`Unexpected positional argument '${flag ?? ''}'.`);
    if (flag !== '--input' && flag !== '--output') throw new Error(`Unknown option '${flag}'.`);
    const value = values[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}.`);
    result[flag === '--input' ? 'input' : 'output'] = value;
  }
  return result;
}
