import { executeRun, DEFAULT_RUN_CONFIG, type RunConfig } from '../src/performance/runner.js';

const config = parseArgs(process.argv.slice(2));
const controller = new AbortController();
process.once('SIGINT', () => { console.error('\nStop requested; finishing in-flight requests and marking the run incomplete.'); controller.abort(); });

try {
  const result = await executeRun(config, {
    signal: controller.signal,
    onProgress: (completed, target) => {
      if (completed === 1 || completed === target || completed % Math.max(1, Math.floor(target / 20)) === 0) {
        console.error(`Progress: ${completed}/${target} requests`);
      }
    },
  });
  console.error(`Run ${result.summary.status}: ${result.runDirectory}`);
  console.error(`Next command: codex --agent logging-agent -- "Analyze ${result.runDirectory}"`);
  if (result.summary.status !== 'complete') process.exitCode = 2;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function parseArgs(args: string[]): Partial<RunConfig> {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument?.startsWith('--')) throw new Error(`Unexpected argument '${argument ?? ''}'.`);
    const [key, inlineValue] = argument.slice(2).split('=', 2);
    const value = inlineValue ?? args[++index];
    if (!key || !value) throw new Error(`Missing value for --${key ?? ''}.`);
    values.set(key, value);
  }
  const number = (key: string, fallback: number) => values.has(key) ? Number(values.get(key)) : fallback;
  return {
    baseUrl: values.get('base-url') ?? DEFAULT_RUN_CONFIG.baseUrl,
    scenario: (values.get('scenario') ?? DEFAULT_RUN_CONFIG.scenario) as 'catalog',
    requests: number('requests', DEFAULT_RUN_CONFIG.requests),
    concurrency: number('concurrency', DEFAULT_RUN_CONFIG.concurrency),
    durationSeconds: number('duration-seconds', DEFAULT_RUN_CONFIG.durationSeconds),
    rampSeconds: number('ramp-seconds', DEFAULT_RUN_CONFIG.rampSeconds),
    seed: number('seed', DEFAULT_RUN_CONFIG.seed),
    errorRate: number('error-rate', DEFAULT_RUN_CONFIG.errorRate),
    output: values.get('output') ?? DEFAULT_RUN_CONFIG.output,
  };
}
