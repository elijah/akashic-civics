/**
 * Benchmark Framework for Red Flag Reporter
 * National/state averages integration, percentile ranking, similar jurisdiction matching
 */

import { twoProportionZTest } from '../accountability/statistical_testing';

export interface StateBenchmark {
  stateId: string;
  stateName: string;
  totalCases: number;
  overallConvictionRate: number;
  convictionRatesByRace: Record<string, number>;
  demographicDistribution: Record<string, number>; // race -> proportion of cases
}

export interface JurisdictionBenchmark {
  jurisdictionId: string;
  jurisdictionName: string;
  stateId: string;
  cases: number;
  convictionRate: number;
  convictionRateByRace: Record<string, number>;
  disparityGap: number; // vs state average
  percentileRank: number; // 0-100, higher = worse disparity
  similarJurisdictions: SimilarJurisdictionMatch[];
}

export interface SimilarJurisdictionMatch {
  jurisdictionId: string;
  jurisdictionName: string;
  state: string;
  caseCount: number;
  convictionRate: number;
  demographicProfile: Record<string, number>;
  distanceMetric: number; // 0 = identical, larger = less similar
  similarityScore: number; // 0-1, 1 = identical match
}

export interface BenchmarkAnalysisResult {
  jurisdictionBenchmark: JurisdictionBenchmark;
  stateBenchmark: StateBenchmark;
  nationalBenchmark?: StateBenchmark;
  recommendations: string[];
}

/**
 * Load state benchmarks from reference data.
 * In production, this would query a database of state-level statistics.
 */
export function loadStateBenchmarks(): StateBenchmark[] {
  return [
    {
      stateId: 'US',
      stateName: 'United States',
      totalCases: 1000000,
      overallConvictionRate: 0.65,
      convictionRatesByRace: { White: 0.52, Black: 0.65, Hispanic: 0.58, Other: 0.54 },
      demographicDistribution: { White: 0.70, Black: 0.15, Hispanic: 0.12, Other: 0.03 },
    },
    {
      stateId: 'TN',
      stateName: 'Tennessee',
      totalCases: 50000,
      overallConvictionRate: 0.70,
      convictionRatesByRace: { White: 0.58, Black: 0.78, Hispanic: 0.62, Other: 0.60 },
      demographicDistribution: { White: 0.72, Black: 0.20, Hispanic: 0.05, Other: 0.03 },
    },
    {
      stateId: 'CA',
      stateName: 'California',
      totalCases: 200000,
      overallConvictionRate: 0.60,
      convictionRatesByRace: { White: 0.50, Black: 0.72, Hispanic: 0.55, Other: 0.51 },
      demographicDistribution: { White: 0.55, Black: 0.06, Hispanic: 0.30, Other: 0.09 },
    },
  ];
}

/**
 * Compute jurisdiction benchmark against state and national references.
 */
/**
 * Compute jurisdiction benchmark against state and national references.
 * @param jurisdictionId - Unique identifier for the jurisdiction
 * @param jurisdictionName - Human-readable name
 * @param jurisdictionRate - Overall conviction rate
 * @param jurisdictionRaceRates - Conviction rates by race/category
 * @param jurDisDistribution - Case distribution by demographic group (proportions)
 * @param jurCaseCount - Total number of cases
 * @param stateBenchmarks - Array of state-level benchmarks
 */
export function computeJurisdictionBenchmark(
  jurisdictionId: string,
  jurisdictionName: string,
  jurisdictionRate: number,
  jurisdictionRaceRates: Record<string, number>,
  jurDisDistribution: Record<string, number>,
  jurCaseCount: number,
  stateBenchmarks: StateBenchmark[],
  stateId?: string
): JurisdictionBenchmark {
  const stateBench =
    stateId !== undefined
      ? stateBenchmarks.find(b => b.stateId === stateId)
      : stateBenchmarks[0];
  const resolvedState = stateBench ?? loadStateBenchmarks()[0];

  // Compute disparity gap vs state average
  const stateAvg = resolvedState.overallConvictionRate;
  const disparityGap = jurisdictionRate - stateAvg;

  // Compute percentile ranking
  const raceGroups = Object.keys({
    ...jurisdictionRaceRates,
    ...resolvedState.convictionRatesByRace,
  });
  let worseThanCount = 0;
  let totalComparisons = 0;

  for (const race of raceGroups) {
    const jurRate = jurisdictionRaceRates[race];
    const courtRate = resolvedState.convictionRatesByRace[race];
    if (jurRate !== undefined && courtRate !== undefined) {
      totalComparisons++;
      // Use simple rate comparison with approximate sample sizes
      const jurN = jurCaseCount * (jurDisDistribution[race] ?? 0);
      const courtN = resolvedState.totalCases * (resolvedState.demographicDistribution[race] ?? 0);
      if (jurN > 10 && courtN > 10 && jurRate !== courtRate) {
        const test = twoProportionZTest(jurRate, jurN, courtRate, courtN);
        if (test.pValue < 0.05 && jurRate > courtRate) {
          worseThanCount++;
        }
      } else if (jurRate > courtRate) {
        worseThanCount++;
      }
    }
  }

  const percentileRank = totalComparisons > 0 ? Math.round((worseThanCount / totalComparisons) * 100) : 50;

  const similar = findSimilarJurisdictions(jurisdictionRate, jurDisDistribution, stateBenchmarks);

  return {
    jurisdictionId,
    jurisdictionName,
    stateId: resolvedState.stateId,
    cases: jurCaseCount,
    convictionRate: jurisdictionRate,
    convictionRateByRace: jurisdictionRaceRates,
    disparityGap,
    percentileRank,
    similarJurisdictions: similar,
  };
}

/**
 * Find similar jurisdictions via case-mix adjusted comparison.
 * Uses direct standardization to compare on equal footing.
 */
function findSimilarJurisdictions(
  jurisdictionRate: number,
  jurDisDistribution: Record<string, number>,
  stateBenchmarks: StateBenchmark[]
): SimilarJurisdictionMatch[] {
  const benchmarks = stateBenchmarks.length > 0 ? stateBenchmarks : loadStateBenchmarks();
  const results: SimilarJurisdictionMatch[] = [];

  for (const bench of benchmarks) {
    // Distance based on conviction rate gap plus demographic profile divergence
    const rateGap = Math.abs(jurisdictionRate - bench.overallConvictionRate);
    const profileDivergence = demographicDistance(jurDisDistribution, bench.demographicDistribution);
    const distanceMetric = rateGap + profileDivergence;
    const similarityScore = 1 / (1 + distanceMetric);

    results.push({
      jurisdictionId: bench.stateId,
      jurisdictionName: bench.stateName,
      state: bench.stateId,
      caseCount: bench.totalCases,
      convictionRate: bench.overallConvictionRate,
      demographicProfile: bench.demographicDistribution,
      distanceMetric,
      similarityScore,
    });
  }

  // Sort by similarity (highest first)
  results.sort((a, b) => b.similarityScore - a.similarityScore);

  // Return top 3
  return results.slice(0, 3);
}

/**
 * Total variation distance between two demographic distributions.
 * Ranges 0 (identical) to 1 (completely disjoint).
 */
function demographicDistance(a: Record<string, number>, b: Record<string, number>): number {
  const groups = new Set([...Object.keys(a), ...Object.keys(b)]);
  let total = 0;
  for (const g of groups) {
    total += Math.abs((a[g] ?? 0) - (b[g] ?? 0));
  }
  return total / 2;
}

/**
 * Generate benchmark analysis report for a jurisdiction.
 * @param jurisdictionId - Unique identifier
 * @param jurisdictionName - Human-readable name
 * @param jurisdictionRate - Overall conviction rate
 * @param jurisdictionRaceRates - Conviction rates by race
 * @param jurDisDistribution - Case distribution by demographic (proportions that sum ~1)
 * @param jurCaseCount - Total case count
 * @param stateBenchmarks - Optional custom benchmarks; defaults to loaded state data
 */
export function generateBenchmarkAnalysis(
  jurisdictionId: string,
  jurisdictionName: string,
  jurisdictionRate: number,
  jurisdictionRaceRates: Record<string, number>,
  jurDisDistribution: Record<string, number>,
  jurCaseCount: number,
  stateBenchmarks: StateBenchmark[] = loadStateBenchmarks()
): BenchmarkAnalysisResult {
  const jurBench = computeJurisdictionBenchmark(
    jurisdictionId,
    jurisdictionName,
    jurisdictionRate,
    jurisdictionRaceRates,
    jurDisDistribution,
    jurCaseCount,
    stateBenchmarks
  );

  const recommendations: string[] = [];

  if (jurBench.percentileRank > 80) {
    recommendations.push(
      `Your jurisdiction's percentile rank is ${jurBench.percentileRank}%, meaning ` +
      `it performs worse than ${jurBench.percentileRank}% of comparable jurisdictions nationally. ` +
      `Consider a full disconfirmation analysis and policy review.`
    );
  }

  if (Math.abs(jurBench.disparityGap) > 0.10) {
    recommendations.push(
      `Disparity gap of ${jurBench.disparityGap.toFixed(3)} percentage points ${
        jurBench.disparityGap > 0 ? 'exceeds' : 'falls below'
      } the state average. Investigate contributing factors.`
    );
  }

  jurBench.similarJurisdictions.forEach(sj => {
    if (sj.similarityScore > 0.7) {
      recommendations.push(
        `Comparable jurisdiction ${sj.jurisdictionName} has a ${sj.convictionRate.toFixed(3)} conviction rate ` +
        `(distance: ${sj.distanceMetric.toFixed(3)} vs your ${jurBench.disparityGap.toFixed(3)}). ` +
        `Review their approaches for potential mitigations.`
      );
    }
  });

  return {
    jurisdictionBenchmark: jurBench,
    stateBenchmark: stateBenchmarks.length > 0 ? stateBenchmarks[0] : loadStateBenchmarks()[0],
    recommendations,
  };
}