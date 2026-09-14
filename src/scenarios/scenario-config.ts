export const DEFAULT_SCENARIO_CONFIG = {
  scenario: 'catalog',
  searchDelayMs: 250,
  searchErrorRate: 0.02,
  loadDurationSeconds: 60,
  targetRequests: 20_000,
  randomSeed: 42,
  runId: 'local',
} as const;

export const SCENARIO_LIMITS = {
  maxSearchDelayMs: 60_000,
  maxLoadDurationSeconds: 3_600,
  maxTargetRequests: 100_000,
} as const;

export interface ScenarioConfig {
  readonly scenario: 'catalog';
  readonly searchDelayMs: number;
  readonly searchErrorRate: number;
  readonly loadDurationSeconds: number;
  readonly targetRequests: number;
  readonly randomSeed: number;
  readonly runId: string;
}

export class ScenarioConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScenarioConfigError';
  }
}

export function loadScenarioConfig(environment: NodeJS.ProcessEnv = process.env): ScenarioConfig {
  const scenario = readString(environment.SCENARIO, DEFAULT_SCENARIO_CONFIG.scenario);
  if (scenario !== 'catalog') throw new ScenarioConfigError("SCENARIO must be 'catalog'.");

  return {
    scenario,
    searchDelayMs: readInteger(environment.SEARCH_DELAY_MS, DEFAULT_SCENARIO_CONFIG.searchDelayMs, 0, SCENARIO_LIMITS.maxSearchDelayMs),
    searchErrorRate: readRate(environment.SEARCH_ERROR_RATE, DEFAULT_SCENARIO_CONFIG.searchErrorRate),
    loadDurationSeconds: readInteger(environment.LOAD_DURATION_SECONDS, DEFAULT_SCENARIO_CONFIG.loadDurationSeconds, 1, SCENARIO_LIMITS.maxLoadDurationSeconds),
    targetRequests: readInteger(environment.TARGET_REQUESTS, DEFAULT_SCENARIO_CONFIG.targetRequests, 1, SCENARIO_LIMITS.maxTargetRequests),
    randomSeed: readInteger(environment.RANDOM_SEED, DEFAULT_SCENARIO_CONFIG.randomSeed, -2_147_483_648, 2_147_483_647),
    runId: readRunId(environment.RUN_ID),
  };
}

function readString(value: string | undefined, fallback: string): string { return value === undefined ? fallback : value.trim(); }

function readRunId(value: string | undefined): string {
  const runId = readString(value, DEFAULT_SCENARIO_CONFIG.runId);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(runId)) throw new ScenarioConfigError('RUN_ID must be 1-64 characters using letters, numbers, dot, underscore, or hyphen.');
  return runId;
}

function readInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new ScenarioConfigError(`Expected an integer between ${minimum} and ${maximum}, received '${value ?? String(fallback)}'.`);
  return parsed;
}

function readRate(value: string | undefined, fallback: number): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) throw new ScenarioConfigError(`SEARCH_ERROR_RATE must be between 0 and 1, received '${value ?? String(fallback)}'.`);
  return parsed;
}
