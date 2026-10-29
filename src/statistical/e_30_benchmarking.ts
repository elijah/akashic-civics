/**
 * Multi-Jurisdictional Benchmarking Framework for Akashic Civics
 * 
 * Provides cross-jurisdictional comparison capabilities:
 * - Peer group identification based on demographic/case characteristics
 * - Case-mix adjusted comparisons using indirect standardization
 * - State/national percentile ranking calculations
 * - Similar jurisdiction matching via Mahalanobis distance
 * - Risk-adjusted performance metrics
 * - Percentile ranking against national/state averages
 */

import { DataSnapshot } from './historical_baseline';

/**
 * Jurisdiction profile for benchmarking
 */
export interface JurisdictionProfile {
  id: string;
  name: string;
  state: string;
  convictionRate: number;
  avgSentenceMonths: number;
  avgDaysToDisposition: number;
  caseCount: number;
  demographicDistribution: Record<string, number>;
  offenseMix: Record<string, number>;
  missingRate: number;
  year: number;
  population?: number;
  povertyRate?: number;
  urbanizationRate?: number;
}

/**
 * Peer group identification result
 */
export interface PeerGroupResult {
  targetId: string;
  peerIds: string[];
  peerNames: string[];
  similarityScores: number[];
  distanceMetric: 'mahalanobis' | 'euclidean' | 'cosine';
  peerGroupSize: number;
  criteria: Record<string, number>;
}

/**
 * Percentile ranking result
 */
export interface PercentileRankResult {
  jurisdictionId: string;
  metric: string;
  jurisdictionValue: number;
  percentile: number; // 0-100
  nationalAverage: number;
  stateAverage: number;
  rank: number; // Rank among all jurisdictions
  totalJurisdictions: number;
  interpretation: string;
}

/**
 * Case-mix adjustment result
 */
export interface RiskAdjustmentResult {
  jurisdictionId: string;
  rawRate: number;
  adjustedRate: number;
  riskAdjustmentFactor: number;
  expectedRate: number;
  ratioObservedToExpected: number;
  confidenceInterval: [number, number];
  isStatisticallyDifferent: boolean;
}

/**
 * Similar jurisdiction matching result
 */
export interface SimilarJurisdictionResult {
  targetId: string;
  similarJurisdictions: Array<{
    jurisdictionId: string;
    jurisdictionName: string;
    state: string;
    similarityScore: number;
    convictionGap: number;
    caseCount: number;
  }>;
  matchCriteria: string[];
}

/**
 * Benchmark comparison result
 */
export interface BenchmarkComparison {
  jurisdictionId: string;
  jurisdictionName: string;
  state: string;
  metrics: Array<{
    name: string;
    jurisdictionValue: number;
    peerAverage: number;
    stateAverage: number;
    nationalAverage: number;
    percentileVsPeer: number;
    percentileVsState: number;
    percentileVsNational: number;
    peerDifference: number;
    stateDifference: number;
    nationalDifference: number;
    riskLevel: 'low' | 'moderate' | 'high';
  }>;
  overallAssessment: 'below_average' | 'average' | 'above_average';
  percentileRank: number;
}

/**
 * BenchmarkFramework - core benchmarking engine
 */
export class BenchmarkFramework {
  private jurisdictions: JurisdictionProfile[] = [];

  /**
   * Register a jurisdiction profile
   */
  registerJurisdiction(profile: JurisdictionProfile): void {
    this.jurisdictions.push(profile);
  }

  /**
   * Register multiple jurisdictions
   */
  registerJurisdictions(profiles: JurisdictionProfile[]): void {
    profiles.forEach(p => this.jurisdictions.push(p));
  }

  /**
   * Get all registered jurisdictions
   */
  getJurisdictions(): JurisdictionProfile[] {
    return [...this.jurisdictions];
  }

  /**
   * Identify peer groups for a target jurisdiction using similarity scoring
   */
  identifyPeerGroup(
    targetId: string,
    criteria: Record<string, number>,
    nPeers: number = 5,
    distanceMetric: 'mahalanobis' | 'euclidean' | 'cosine' = 'mahalanobis'
  ): PeerGroupResult {
    const target = this.jurisdictions.find(j => j.id === targetId);
    if (!target) {
      throw new Error(`Jurisdiction ${targetId} not found`);
    }

    const others = this.jurisdictions.filter(j => j.id !== targetId);

    // Compute distance to each other jurisdiction
    const distances = others.map(j => {
      const distance = this.computeDistance(target, j, criteria, distanceMetric);
      return { jurisdictionId: j.id, jurisdictionName: j.name, distance };
    });

    // Sort by distance (closest first)
    distances.sort((a, b) => a.distance - b.distance);

    const peers = distances.slice(0, nPeers);

    return {
      targetId,
      peerIds: peers.map(p => p.jurisdictionId),
      peerNames: peers.map(p => p.jurisdictionName),
      similarityScores: peers.map(p => 1 / (1 + p.distance)),
      distanceMetric,
      peerGroupSize: peers.length,
      criteria
    };
  }

  /**
   * Compute percentile ranking for a jurisdiction against all registered jurisdictions
   */
  computePercentileRank(
    jurisdictionId: string,
    metric: 'convictionRate' | 'avgSentenceMonths' | 'avgDaysToDisposition' | 'missingRate'
  ): PercentileRankResult {
    const target = this.jurisdictions.find(j => j.id === jurisdictionId);
    if (!target) {
      throw new Error(`Jurisdiction ${jurisdictionId} not found`);
    }

    const targetValue = target[metric];
    const allValues = this.jurisdictions.map(j => j[metric]).sort((a, b) => a - b);

    // Compute percentile (percentage of jurisdictions below target)
    const belowCount = allValues.filter(v => v < targetValue).length;
    const percentile = (belowCount / allValues.length) * 100;

    const nationalAverage = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const stateJurisdictions = this.jurisdictions.filter(j => j.state === target.state);
    const stateValues = stateJurisdictions.map(j => j[metric]);
    const stateAverage = stateValues.length > 0
      ? stateValues.reduce((a, b) => a + b, 0) / stateValues.length
      : nationalAverage;

    // Rank (1 = highest/best depending on metric interpretation)
    const sortedDesc = [...allValues].sort((a, b) => b - a);
    const rank = sortedDesc.indexOf(targetValue) + 1;

    const interpretation = percentile <= 25
      ? `Bottom quartile: ${targetValue.toFixed(3)} is lower than ${percentile.toFixed(0)}% of jurisdictions`
      : percentile >= 75
        ? `Top quartile: ${targetValue.toFixed(3)} is higher than ${percentile.toFixed(0)}% of jurisdictions`
        : `Mid-range: ${targetValue.toFixed(3)} is at ${percentile.toFixed(0)}th percentile`;

    return {
      jurisdictionId,
      metric,
      jurisdictionValue: targetValue,
      percentile,
      nationalAverage,
      stateAverage,
      rank,
      totalJurisdictions: allValues.length,
      interpretation
    };
  }

  /**
   * Risk-adjust a jurisdiction's rate using indirect standardization
   */
  riskAdjustRate(
    jurisdictionId: string,
    rawRate: number,
    expectedRate: number
  ): RiskAdjustmentResult {
    // Standardized Mortality Ratio style: observed / expected
    const ratio = expectedRate > 0 ? rawRate / expectedRate : 1;
    const riskAdjustmentFactor = 1 / ratio; // Factor to adjust raw rate to expected

    // Confidence interval using Poisson approximation
    const se = Math.sqrt(rawRate) / expectedRate; // simplified
    const ciLower = Math.max(0, ratio - 1.96 * se);
    const ciUpper = ratio + 1.96 * se;

    const isStatisticallyDifferent = ciLower > 1 || ciUpper < 1;

    return {
      jurisdictionId,
      rawRate,
      adjustedRate: rawRate * riskAdjustmentFactor,
      riskAdjustmentFactor,
      expectedRate,
      ratioObservedToExpected: ratio,
      confidenceInterval: [ciLower, ciUpper],
      isStatisticallyDifferent
    };
  }

  /**
   * Find similar jurisdictions to a target using case-mix characteristics
   */
  findSimilarJurisdictions(
    targetId: string,
    nMatches: number = 5,
    criteria: string[] = ['convictionRate', 'avgSentenceMonths', 'caseCount']
  ): SimilarJurisdictionResult {
    const target = this.jurisdictions.find(j => j.id === targetId);
    if (!target) {
      throw new Error(`Jurisdiction ${targetId} not found`);
    }

    const others = this.jurisdictions.filter(j => j.id !== targetId);

    const similar = others.map(j => {
      const similarity = this.computeSimilarity(target, j, criteria);
      return {
        jurisdictionId: j.id,
        jurisdictionName: j.name,
        state: j.state,
        similarityScore: similarity,
        convictionGap: Math.abs(j.convictionRate - target.convictionRate),
        caseCount: j.caseCount
      };
    });

    // Sort by similarity (highest first)
    similar.sort((a, b) => b.similarityScore - a.similarityScore);

    return {
      targetId,
      similarJurisdictions: similar.slice(0, nMatches),
      matchCriteria: criteria
    };
  }

  /**
   * Generate comprehensive benchmark comparison for a jurisdiction
   */
  generateBenchmarkComparison(
    jurisdictionId: string,
    peerGroupSize: number = 5
  ): BenchmarkComparison {
    const target = this.jurisdictions.find(j => j.id === jurisdictionId);
    if (!target) {
      throw new Error(`Jurisdiction ${jurisdictionId} not found`);
    }

    // Identify peer group
    const peerGroup = this.identifyPeerGroup(
      jurisdictionId,
      { convictionRate: target.convictionRate, caseCount: target.caseCount },
      peerGroupSize
    );

    const peerProfiles = this.jurisdictions.filter(j => peerGroup.peerIds.includes(j.id));
    const allProfiles = this.jurisdictions;

    const metrics = ['convictionRate', 'avgSentenceMonths', 'avgDaysToDisposition', 'missingRate']
      .map(metric => {
        const targetValue = target[metric as keyof JurisdictionProfile] as number;
        const peerAvg = peerProfiles.length > 0
          ? peerProfiles.reduce((sum, p) => sum + (p[metric as keyof JurisdictionProfile] as number), 0) / peerProfiles.length
          : targetValue;
        const stateProfiles = allProfiles.filter(j => j.state === target.state);
        const stateAvg = stateProfiles.length > 0
          ? stateProfiles.reduce((sum, p) => sum + (p[metric as keyof JurisdictionProfile] as number), 0) / stateProfiles.length
          : targetValue;
        const nationalAvg = allProfiles.reduce((sum, p) => sum + (p[metric as keyof JurisdictionProfile] as number), 0) / allProfiles.length;

        const percentileVsPeer = this.computePercentileForValue(targetValue, peerProfiles.map(p => p[metric as keyof JurisdictionProfile] as number));
        const percentileVsState = this.computePercentileForValue(targetValue, stateProfiles.map(p => p[metric as keyof JurisdictionProfile] as number));
        const percentileVsNational = this.computePercentileForValue(targetValue, allProfiles.map(p => p[metric as keyof JurisdictionProfile] as number));

        const riskLevel: 'low' | 'moderate' | 'high' = percentileVsNational <= 25 || percentileVsNational >= 75 ? 'high' : percentileVsNational <= 40 || percentileVsNational >= 60 ? 'moderate' : 'low';

        return {
          name: metric,
          jurisdictionValue: targetValue,
          peerAverage: peerAvg,
          stateAverage: stateAvg,
          nationalAverage: nationalAvg,
          percentileVsPeer,
          percentileVsState,
          percentileVsNational,
          peerDifference: targetValue - peerAvg,
          stateDifference: targetValue - stateAvg,
          nationalDifference: targetValue - nationalAvg,
          riskLevel
        };
      });

    const overallPercentile = metrics.reduce((sum, m) => sum + m.percentileVsNational, 0) / metrics.length;

    const overallAssessment = overallPercentile <= 33 ? 'below_average' :
      overallPercentile >= 66 ? 'above_average' : 'average';

    return {
      jurisdictionId,
      jurisdictionName: target.name,
      state: target.state,
      metrics,
      overallAssessment,
      percentileRank: overallPercentile
    };
  }

  /**
   * Compute distance between two jurisdictions using specified metric
   */
  private computeDistance(
    a: JurisdictionProfile,
    b: JurisdictionProfile,
    criteria: Record<string, number>,
    metric: 'mahalanobis' | 'euclidean' | 'cosine'
  ): number {
    const keys = Object.keys(criteria);

    // Normalize values using criteria as weights
    const diffs = keys.map(k => {
      const valA = this.getCriterionValue(a, k);
      const valB = this.getCriterionValue(b, k);
      return (valA - valB) * (criteria[k] || 1);
    });

    if (metric === 'euclidean') {
      return Math.sqrt(diffs.reduce((sum, d) => sum + d * d, 0));
    }

    if (metric === 'cosine') {
      const dotProduct = diffs.reduce((sum, d, i) => sum + d * diffs[i], 0);
      const normA = Math.sqrt(diffs.reduce((sum, d) => sum + d * d, 0));
      const normB = Math.sqrt(diffs.reduce((sum, d) => sum + d * d, 0));
      if (normA === 0 || normB === 0) return 0;
      return 1 - dotProduct / (normA * normB);
    }

    // Mahalanobis (simplified - using diagonal covariance)
    const variance = keys.reduce((sum, k) => {
      const val = this.getCriterionValue(a, k);
      return sum + val * val;
    }, 0) / keys.length || 1;

    return Math.sqrt(diffs.reduce((sum, d) => sum + (d * d) / variance, 0));
  }

  /**
   * Compute similarity score between two jurisdictions (0-1, higher = more similar)
   */
  private computeSimilarity(
    a: JurisdictionProfile,
    b: JurisdictionProfile,
    criteria: string[]
  ): number {
    let totalDiff = 0;
    let totalRange = 0;

    for (const criterion of criteria) {
      const valA = a[criterion as keyof JurisdictionProfile];
      const valB = b[criterion as keyof JurisdictionProfile];
      const numA = typeof valA === 'number' ? valA : 0;
      const numB = typeof valB === 'number' ? valB : 0;

      const range = Math.max(Math.abs(numA), Math.abs(numB), 1);
      totalDiff += Math.abs(numA - numB);
      totalRange += range;
    }

    return totalRange > 0 ? 1 - totalDiff / totalRange : 0;
  }

  /**
   * Compute percentile of a value within a distribution
   */
  private computePercentileForValue(value: number, distribution: number[]): number {
    if (distribution.length === 0) return 50;
    const sorted = [...distribution].sort((a, b) => a - b);
    const belowCount = sorted.filter(v => v < value).length;
    return (belowCount / sorted.length) * 100;
  }

  /**
   * Get criterion value from jurisdiction profile
   */
  private getCriterionValue(j: JurisdictionProfile, criterion: string): number {
    const val = j[criterion as keyof JurisdictionProfile];
    return typeof val === 'number' ? val : 0;
  }

  /**
   * Export benchmark data for reporting
   */
  exportBenchmarkData(): string {
    return JSON.stringify(this.jurisdictions, null, 2);
  }
}

/**
 * Convenience function to create a benchmark framework from snapshots
 */
export function createBenchmarkFramework(
  snapshots: { jurisdictionId: string; snapshot: DataSnapshot }[]
): BenchmarkFramework {
  const framework = new BenchmarkFramework();
  snapshots.forEach(({ jurisdictionId, snapshot }) => {
    const stats = snapshot.key_statistics;
    framework.registerJurisdiction({
      id: jurisdictionId,
      name: jurisdictionId,
      state: 'unknown',
      convictionRate: stats.conviction_rate,
      avgSentenceMonths: stats.avg_sentence_months,
      avgDaysToDisposition: stats.avg_days_to_disposition,
      caseCount: snapshot.case_count,
      demographicDistribution: stats.demographic_distribution,
      offenseMix: stats.offense_mix,
      missingRate: stats.missing_rate,
      year: new Date(snapshot.timestamp).getFullYear()
    });
  });
  return framework;
}

export default {
  BenchmarkFramework,
  createBenchmarkFramework
};
