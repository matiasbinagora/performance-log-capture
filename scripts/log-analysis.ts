import { promises as fs } from 'node:fs';
import { analyzeRun, analysisOutputPath } from '../src/analysis/log-analyzer.js';

const args = parseArgs(process.argv.slice(2));
try {
  const result = await analyzeRun(args.input);
  const output = args.output ?? analysisOutputPath(args.input);
  await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ...result, outputPath: output })}\n`);
  process.exitCode = result.status === 'complete' ? 0 : 2;
} catch (error) {
  console.error(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

function parseArgs(args: string[]): { input: string; output?: string } {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument?.startsWith('--')) throw new Error(`Unexpected argument '${argument ?? ''}'.`);
    const [key, inline] = argument.slice(2).split('=', 2); const value = inline ?? args[++index];
    if (!key || !value) throw new Error(`Missing value for --${key ?? ''}.`); values.set(key, value);
  }
  const input = values.get('input') ?? args[0]; if (!input) throw new Error('Usage: npm run log-analysis -- --input runs/<run-id> [--output path]');
  const output = values.get('output'); return output ? { input, output } : { input };
}
