import type { ScenarioConfig } from './scenario-config.js';

export interface SearchScenarioOutcome { readonly failed: boolean; readonly errorCode?: 'SEARCH_SIMULATED_ERROR'; }
export interface ScenarioRuntime { prepareSearch(): Promise<SearchScenarioOutcome>; }

export function createScenarioRuntime(config: ScenarioConfig): ScenarioRuntime {
  let searchRequestNumber = 0;
  return {
    async prepareSearch() {
      searchRequestNumber += 1;
      const requestNumber = searchRequestNumber;
      await wait(config.searchDelayMs);
      if (deterministicSample(config.randomSeed, requestNumber) < config.searchErrorRate) return { failed: true, errorCode: 'SEARCH_SIMULATED_ERROR' };
      return { failed: false };
    },
  };
}

function deterministicSample(seed: number, requestNumber: number): number {
  let state = (Math.imul(seed | 0, 1_664_525) + Math.imul(requestNumber, 1_013_904_223) + 1_013_904_223) >>> 0;
  state ^= state >>> 16;
  state = Math.imul(state, 2_246_822_519) >>> 0;
  state ^= state >>> 13;
  state = Math.imul(state, 3_266_489_917) >>> 0;
  state ^= state >>> 16;
  return (state >>> 0) / 4_294_967_296;
}

function wait(durationMs: number): Promise<void> { return durationMs === 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, durationMs)); }
