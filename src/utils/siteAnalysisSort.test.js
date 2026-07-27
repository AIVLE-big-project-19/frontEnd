import { describe, expect, it } from 'vitest';
import { sortSiteAnalyses } from './siteAnalysisSort';

const sites = [
  { address: 'A', suitabilityScore: 70, estimatedInstallationCost: 100 },
  { address: 'B', suitabilityScore: 90, estimatedInstallationCost: 300 },
  { address: 'C', suitabilityScore: 80, estimatedInstallationCost: 200 },
];

describe('sortSiteAnalyses', () => {
  it('sorts numeric metrics in both directions', () => {
    expect(sortSiteAnalyses(sites, 'suitabilityScore', 'desc').map((site) => site.address)).toEqual(['B', 'C', 'A']);
    expect(sortSiteAnalyses(sites, 'estimatedInstallationCost', 'asc').map((site) => site.address)).toEqual(['A', 'C', 'B']);
  });

  it('does not mutate the source list and puts missing values last', () => {
    const source = [{ address: 'missing' }, { address: 'value', areaM2: 20 }];
    expect(sortSiteAnalyses(source, 'areaM2', 'desc').map((site) => site.address)).toEqual(['value', 'missing']);
    expect(source[0].address).toBe('missing');
  });
});
