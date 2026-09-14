import { describe, expect, it } from 'vitest';

import { DEFAULT_SCENARIO_CONFIG, SCENARIO_LIMITS, ScenarioConfigError, loadScenarioConfig } from '../src/scenarios/scenario-config.js';
import { createScenarioRuntime } from '../src/scenarios/deterministic-scenario.js';

describe('performance scenario configuration', () => {
  it('loads sensible deterministic defaults', () => {
    expect(loadScenarioConfig({})).toEqual(DEFAULT_SCENARIO_CONFIG);
  });

  it('loads custom volume and scenario settings', () => {
    expect(loadScenarioConfig({
      SCENARIO: 'catalog', SEARCH_DELAY_MS: '12', SEARCH_ERROR_RATE: '0.25',
      LOAD_DURATION_SECONDS: '10', TARGET_REQUESTS: '500', RANDOM_SEED: '-7', RUN_ID: 'demo-1',
    })).toEqual({ scenario: 'catalog', searchDelayMs: 12, searchErrorRate: 0.25, loadDurationSeconds: 10, targetRequests: 500, randomSeed: -7, runId: 'demo-1' });
  });

  it.each([
    ['SCENARIO', { SCENARIO: 'unknown' }],
    ['SEARCH_DELAY_MS', { SEARCH_DELAY_MS: '-1' }],
    ['SEARCH_ERROR_RATE', { SEARCH_ERROR_RATE: '1.1' }],
    ['LOAD_DURATION_SECONDS', { LOAD_DURATION_SECONDS: '0' }],
    ['TARGET_REQUESTS', { TARGET_REQUESTS: '0' }],
    ['RANDOM_SEED', { RANDOM_SEED: 'not-a-number' }],
    ['RUN_ID', { RUN_ID: 'not safe!' }],
  ])('rejects invalid %s configuration', (_name, environment) => {
    expect(() => loadScenarioConfig(environment)).toThrow(ScenarioConfigError);
  });

  it('rejects values above the execution safeguards', () => {
    expect(() => loadScenarioConfig({ SEARCH_DELAY_MS: String(SCENARIO_LIMITS.maxSearchDelayMs + 1) })).toThrow(ScenarioConfigError);
    expect(() => loadScenarioConfig({ LOAD_DURATION_SECONDS: String(SCENARIO_LIMITS.maxLoadDurationSeconds + 1) })).toThrow(ScenarioConfigError);
    expect(() => loadScenarioConfig({ TARGET_REQUESTS: String(SCENARIO_LIMITS.maxTargetRequests + 1) })).toThrow(ScenarioConfigError);
  });
});

describe('deterministic search scenario', () => {
  const config = (randomSeed: number) => loadScenarioConfig({ SEARCH_DELAY_MS: '0', SEARCH_ERROR_RATE: '0.35', RANDOM_SEED: String(randomSeed) });

  async function outcomes(randomSeed: number): Promise<boolean[]> {
    const runtime = createScenarioRuntime(config(randomSeed));
    return Promise.all(Array.from({ length: 20 }, async () => (await runtime.prepareSearch()).failed));
  }

  it('repeats the same error outcomes for the same seed', async () => {
    expect(await outcomes(42)).toEqual(await outcomes(42));
  });

  it('changes the error distribution when the seed changes', async () => {
    expect(await outcomes(42)).not.toEqual(await outcomes(43));
  });

  it('applies the configured delay to search preparation', async () => {
    const startedAt = performance.now();
    await createScenarioRuntime(loadScenarioConfig({ SEARCH_DELAY_MS: '20', SEARCH_ERROR_RATE: '0' })).prepareSearch();
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(15);
  });
});
