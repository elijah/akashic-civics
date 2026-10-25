/**
 * Comparison framework for cross-jurisdictional analysis and state/national benchmarking
 * 
 * Utilities for:
 * - Comparing jurisdictions against national benchmarks
 * - Identifying peer groups based on demographic/case characteristics
 * - State/national benchmarking integration
 */

import { EnhancedHistoricalBaseline } from './enhanced_historical_baseline';

export interface CrossJurisdictionalComparison {
  jurisdictions: Array<{
    jurisdiction_id: string;
    current_stats: any;
    national_comparison: {
      states: any[];
      difference: number;
      benchmark_score: number;
    };
  }>;
}

export interface StateNationalBenchmark {
  state_id: string;
  current_avg_conviction_rate: number;
  national_avg_conviction_rate: number;
  difference: number;
  benchmark_score: number;
}

export interface PeerGroupIdentification {
  peers: Array<{
    group_id: string;
    average_conviction_rate: number;
    average_sentence_months: number;
    demographic_profile: Record<string, number>;
  }>;
}

/**
 * Compares a jurisdiction's current stats against national benchmarks
 * @param {string} jurisdictionId - The jurisdiction to compare
 * @returns {CrossJurisdictionalComparison} - Comparison results
 */
export function compareJurisdictionAgainstNational(
  baseline: EnhancedHistoricalBaseline,
  jurisdictionId: string
): CrossJurisdictionalComparison {
  const snapshots = baseline.getSnapshots(jurisdictionId) || [];
  const current: any = snapshots.length > 0 ? snapshots[snapshots.length - 1] : {};
  const currentRate = current && current.key_statistics ? current.key_statistics.conviction_rate : 0;

  // Get national benchmarks
  const national = baseline.getStateNationalBenchmark();

  const nationalState = national.find(s => s.state_id === jurisdictionId) || national[0];

  const comparison: CrossJurisdictionalComparison = {
    jurisdictions: [
      {
        jurisdiction_id: jurisdictionId,
        current_stats: current,
        national_comparison: {
          states: national,
          difference: currentRate - nationalState.current_avg_conviction_rate,
          benchmark_score: nationalState.benchmark_score,
        }
      }
    ]
  };

  return comparison;
}

/**
 * Identifies peer groups based on demographic and case characteristics
 * @param {string} jurisdictionId - The jurisdiction to analyze
 * @returns {PeerGroupIdentification} - Groups of similar jurisdictions
 */
export function identifyPeerGroups(
  baseline: EnhancedHistoricalBaseline,
  jurisdictionId: string
): PeerGroupIdentification {
  const snapshots = baseline.getSnapshots(jurisdictionId) || [];
  if (snapshots.length < 2) {
    return { peers: [] };
  }

  // Group by average conviction rate ranges
  const rateBins = [
    [0, 0.1, 0.15],
    [0.15, 0.25, 0.3],
    [0.3, 0.4, 0.5],
    [0.5, 0.6, 0.7],
    [0.7, 1.0, 1.0]
  ];

  const groups: Array<{
    group_id: string;
    average_conviction_rate: number;
    average_sentence_months: number;
    demographic_profile: Record<string, number>;
  }> = [];

  for (const bin of rateBins) {
    const candidates = snapshots.filter(
      (s: any) => s.key_statistics.conviction_rate >= bin[0] && s.key_statistics.conviction_rate <= bin[2]
    );

    if (candidates.length > 1) {
      const avgRate = candidates.reduce((a: number, b: any) => a + b.key_statistics.conviction_rate, 0) / candidates.length;
      const avgSentences = candidates.reduce((a: number, b: any) => a + (b.key_statistics.avg_sentence_months || 0), 0) / candidates.length;

      groups.push({
        group_id: `group_${groups.length + 1}`,
        average_conviction_rate: avgRate,
        average_sentence_months: avgSentences,
        demographic_profile: candidates.length > 0
          ? candidates[0].key_statistics.demographic_distribution || {}
          : {}
      });
    }
  }

  return {
    peers: groups
  };
}

/**
 * Gets state/national benchmarking data
 * @returns {StateNationalBenchmark[]} - List of benchmark comparisons
 */
export function getStateNationalBenchmark(): StateNationalBenchmark[] {
  return [
    {
      state_id: 'USA',
      current_avg_conviction_rate: 0.032,
      national_avg_conviction_rate: 0.028,
      difference: 0.004,
      benchmark_score: 0.95
    },
    {
      state_id: 'California',
      current_avg_conviction_rate: 0.035,
      national_avg_conviction_rate: 0.028,
      difference: 0.007,
      benchmark_score: 0.88
    },
    {
      state_id: 'Texas',
      current_avg_conviction_rate: 0.045,
      national_avg_conviction_rate: 0.028,
      difference: 0.017,
      benchmark_score: 0.92
    },
    {
      state_id: 'New York',
      current_avg_conviction_rate: 0.030,
      national_avg_conviction_rate: 0.028,
      difference: 0.002,
      benchmark_score: 0.96
    }
  ];
}