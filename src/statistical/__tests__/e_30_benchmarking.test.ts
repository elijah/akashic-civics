/**
 * Tests for E30: Multi-Jurisdictional Benchmarking Framework
 */

import {
  BenchmarkFramework,
  createBenchmarkFramework,
  JurisdictionProfile
} from '../e_30_benchmarking';

describe('E30: Multi-Jurisdictional Benchmarking Framework', () => {
  let framework: BenchmarkFramework;
  let testJurisdictions: JurisdictionProfile[];

  beforeEach(() => {
    framework = new BenchmarkFramework();
    
    // Create test jurisdictions with varied characteristics
    testJurisdictions = [
      {
        id: 'LA-County',
        name: 'Los Angeles County',
        state: 'CA',
        convictionRate: 0.65,
        avgSentenceMonths: 48,
        avgDaysToDisposition: 180,
        caseCount: 12500,
        demographicDistribution: { White: 0.3, Black: 0.15, Hispanic: 0.55 },
        offenseMix: { felony: 0.7, misdemeanor: 0.3 },
        missingRate: 0.05,
        year: 2023,
        population: 10000000,
        povertyRate: 0.18,
        urbanizationRate: 0.95
      },
      {
        id: 'SF-County',
        name: 'San Francisco County',
        state: 'CA',
        convictionRate: 0.45,
        avgSentenceMonths: 36,
        avgDaysToDisposition: 150,
        caseCount: 8200,
        demographicDistribution: { White: 0.4, Black: 0.08, Hispanic: 0.2, Asian: 0.32 },
        offenseMix: { felony: 0.6, misdemeanor: 0.4 },
        missingRate: 0.03,
        year: 2023,
        population: 870000,
        povertyRate: 0.11,
        urbanizationRate: 1.0
      },
      {
        id: 'Cook-County',
        name: 'Cook County',
        state: 'IL',
        convictionRate: 0.58,
        avgSentenceMonths: 52,
        avgDaysToDisposition: 200,
        caseCount: 15000,
        demographicDistribution: { White: 0.35, Black: 0.45, Hispanic: 0.2 },
        offenseMix: { felony: 0.75, misdemeanor: 0.25 },
        missingRate: 0.07,
        year: 2023,
        population: 5200000,
        povertyRate: 0.16,
        urbanizationRate: 0.9
      },
      {
        id: 'Harris-County',
        name: 'Harris County',
        state: 'TX',
        convictionRate: 0.72,
        avgSentenceMonths: 60,
        avgDaysToDisposition: 160,
        caseCount: 18000,
        demographicDistribution: { White: 0.25, Black: 0.2, Hispanic: 0.45, Asian: 0.1 },
        offenseMix: { felony: 0.8, misdemeanor: 0.2 },
        missingRate: 0.04,
        year: 2023,
        population: 4700000,
        povertyRate: 0.15,
        urbanizationRate: 0.85
      },
      {
        id: 'Maricopa-County',
        name: 'Maricopa County',
        state: 'AZ',
        convictionRate: 0.55,
        avgSentenceMonths: 42,
        avgDaysToDisposition: 170,
        caseCount: 9500,
        demographicDistribution: { White: 0.55, Black: 0.08, Hispanic: 0.35 },
        offenseMix: { felony: 0.65, misdemeanor: 0.35 },
        missingRate: 0.06,
        year: 2023,
        population: 4400000,
        povertyRate: 0.13,
        urbanizationRate: 0.8
      },
      {
        id: 'Dallas-County',
        name: 'Dallas County',
        state: 'TX',
        convictionRate: 0.68,
        avgSentenceMonths: 55,
        avgDaysToDisposition: 190,
        caseCount: 11000,
        demographicDistribution: { White: 0.3, Black: 0.25, Hispanic: 0.4 },
        offenseMix: { felony: 0.75, misdemeanor: 0.25 },
        missingRate: 0.05,
        year: 2023,
        population: 2600000,
        povertyRate: 0.14,
        urbanizationRate: 0.88
      }
    ];

    framework.registerJurisdictions(testJurisdictions);
  });

  describe('BenchmarkFramework', () => {
    it('should register jurisdictions', () => {
      const jurisdictions = framework.getJurisdictions();
      expect(jurisdictions.length).toBe(6);
      expect(jurisdictions.find(j => j.id === 'LA-County')).toBeDefined();
    });

    it('should identify peer group using Mahalanobis distance', () => {
      const result = framework.identifyPeerGroup('LA-County', { convictionRate: 1, caseCount: 0.5 }, 3, 'mahalanobis');

      expect(result.targetId).toBe('LA-County');
      expect(result.peerIds.length).toBe(3);
      expect(result.peerNames.length).toBe(3);
      expect(result.similarityScores.length).toBe(3);
      expect(result.distanceMetric).toBe('mahalanobis');
      expect(result.peerGroupSize).toBe(3);
      expect(result.peerIds.every(id => id !== 'LA-County')).toBe(true);
    });

    it('should identify peer group using Euclidean distance', () => {
      const result = framework.identifyPeerGroup('LA-County', { convictionRate: 1 }, 2, 'euclidean');

      expect(result.distanceMetric).toBe('euclidean');
      expect(result.peerIds.length).toBe(2);
    });

    it('should identify peer group using Cosine similarity', () => {
      const result = framework.identifyPeerGroup('LA-County', { convictionRate: 1 }, 2, 'cosine');

      expect(result.distanceMetric).toBe('cosine');
      expect(result.peerIds.length).toBe(2);
    });

    it('should throw error for unknown jurisdiction', () => {
      expect(() => framework.identifyPeerGroup('Unknown', { convictionRate: 1 }, 3))
        .toThrow('Jurisdiction Unknown not found');
    });
  });

  describe('Percentile Ranking', () => {
    it('should compute percentile rank against national average', () => {
      const result = framework.computePercentileRank('LA-County', 'convictionRate');

      expect(result.jurisdictionId).toBe('LA-County');
      expect(result.metric).toBe('convictionRate');
      expect(result.jurisdictionValue).toBe(0.65);
      expect(result.percentile).toBeGreaterThanOrEqual(0);
      expect(result.percentile).toBeLessThanOrEqual(100);
      expect(result.nationalAverage).toBeGreaterThan(0);
      expect(result.stateAverage).toBeGreaterThan(0);
      expect(result.rank).toBeGreaterThan(0);
      expect(result.totalJurisdictions).toBe(6);
      expect(typeof result.interpretation).toBe('string');
    });

    it('should compute percentile rank for different metrics', () => {
      const metrics: Array<'convictionRate' | 'avgSentenceMonths' | 'avgDaysToDisposition' | 'missingRate'> = 
        ['convictionRate', 'avgSentenceMonths', 'avgDaysToDisposition', 'missingRate'];

      metrics.forEach(metric => {
        const result = framework.computePercentileRank('LA-County', metric);
        expect(result.metric).toBe(metric);
        expect(result.percentile).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle state-level comparison for CA', () => {
      const result = framework.computePercentileRank('LA-County', 'convictionRate');
      // CA has LA (0.65) and SF (0.45)
      expect(result.stateAverage).toBeCloseTo(0.55, 2);
    });
  });

  describe('Risk Adjustment', () => {
    it('should compute risk-adjusted rate', () => {
      const rawRate = 0.65;
      const expectedRate = 0.55;

      const result = framework.riskAdjustRate('LA-County', rawRate, expectedRate);

      expect(result.jurisdictionId).toBe('LA-County');
      expect(result.rawRate).toBe(rawRate);
      expect(result.expectedRate).toBe(expectedRate);
      expect(result.ratioObservedToExpected).toBeCloseTo(0.65 / 0.55, 2);
      expect(result.confidenceInterval[0]).toBeLessThanOrEqual(result.confidenceInterval[1]);
      expect(typeof result.isStatisticallyDifferent).toBe('boolean');
    });

    it('should handle expected rate of zero', () => {
      const result = framework.riskAdjustRate('LA-County', 0.65, 0);
      expect(result.ratioObservedToExpected).toBe(1);
    });
  });

  describe('Similar Jurisdiction Matching', () => {
    it('should find similar jurisdictions', () => {
      const result = framework.findSimilarJurisdictions('LA-County', 3);

      expect(result.targetId).toBe('LA-County');
      expect(result.similarJurisdictions.length).toBe(3);
      expect(result.similarJurisdictions.every(s => s.jurisdictionId !== 'LA-County')).toBe(true);
      expect(result.similarJurisdictions[0].similarityScore).toBeGreaterThanOrEqual(
        result.similarJurisdictions[1].similarityScore
      );
    });

    it('should include match criteria in result', () => {
      const result = framework.findSimilarJurisdictions('LA-County', 3, ['convictionRate', 'caseCount']);
      expect(result.matchCriteria).toEqual(['convictionRate', 'caseCount']);
    });

    it('should compute conviction gap between jurisdictions', () => {
      const result = framework.findSimilarJurisdictions('LA-County', 2);
      const laConviction = testJurisdictions.find(j => j.id === 'LA-County')!.convictionRate;
      
      result.similarJurisdictions.forEach(s => {
        const otherConviction = testJurisdictions.find(j => j.id === s.jurisdictionId)!.convictionRate;
        expect(s.convictionGap).toBeCloseTo(Math.abs(otherConviction - laConviction), 2);
      });
    });
  });

  describe('Benchmark Comparison', () => {
    it('should generate comprehensive benchmark comparison', () => {
      const result = framework.generateBenchmarkComparison('LA-County');

      expect(result.jurisdictionId).toBe('LA-County');
      expect(result.jurisdictionName).toBe('Los Angeles County');
      expect(result.state).toBe('CA');
      expect(result.metrics.length).toBe(4);
      expect(['below_average', 'average', 'above_average']).toContain(result.overallAssessment);
      expect(result.percentileRank).toBeGreaterThanOrEqual(0);
      expect(result.percentileRank).toBeLessThanOrEqual(100);
    });

    it('should compute peer, state, and national averages', () => {
      const result = framework.generateBenchmarkComparison('LA-County');

      result.metrics.forEach(metric => {
        expect(metric.jurisdictionValue).toBeDefined();
        expect(metric.peerAverage).toBeDefined();
        expect(metric.stateAverage).toBeDefined();
        expect(metric.nationalAverage).toBeDefined();
        expect(metric.percentileVsPeer).toBeGreaterThanOrEqual(0);
        expect(metric.percentileVsState).toBeGreaterThanOrEqual(0);
        expect(metric.percentileVsNational).toBeGreaterThanOrEqual(0);
        expect(['low', 'moderate', 'high']).toContain(metric.riskLevel);
      });
    });

    it('should identify high risk jurisdictions', () => {
      const result = framework.generateBenchmarkComparison('Harris-County');
      // Harris has highest conviction rate (0.72) - should be flagged
      const convictionMetric = result.metrics.find(m => m.name === 'convictionRate');
      expect(convictionMetric?.percentileVsNational).toBeGreaterThan(75);
      expect(convictionMetric?.riskLevel).toBe('high');
    });

    it('should handle custom peer group size', () => {
      const result = framework.generateBenchmarkComparison('LA-County', 2);
      expect(result.metrics.length).toBe(4); // still computes all 4 metrics
    });
  });

  describe('createBenchmarkFramework', () => {
    it('should create framework from snapshots', () => {
      const snapshots = [
        {
          jurisdictionId: 'Test1',
          snapshot: {
            snapshot_id: 'Test1_snap1',
            timestamp: '2023-01-01T00:00:00Z',
            jurisdiction_id: 'Test1',
            case_count: 1000,
            data_hash: 'abc123',
            key_statistics: {
              conviction_rate: 0.6,
              avg_sentence_months: 40,
              avg_days_to_disposition: 150,
              demographic_distribution: { White: 0.5, Black: 0.3 },
              offense_mix: { felony: 0.7, misdemeanor: 0.3 },
              missing_rate: 0.05
            },
            derived_variables: { total_cases: 1000 }
          }
        },
        {
          jurisdictionId: 'Test2',
          snapshot: {
            snapshot_id: 'Test2_snap1',
            timestamp: '2023-01-01T00:00:00Z',
            jurisdiction_id: 'Test2',
            case_count: 800,
            data_hash: 'def456',
            key_statistics: {
              conviction_rate: 0.5,
              avg_sentence_months: 35,
              avg_days_to_disposition: 140,
              demographic_distribution: { White: 0.6, Black: 0.2 },
              offense_mix: { felony: 0.6, misdemeanor: 0.4 },
              missing_rate: 0.03
            },
            derived_variables: { total_cases: 800 }
          }
        }
      ];

      const fw = createBenchmarkFramework(snapshots);
      const jurisdictions = fw.getJurisdictions();

      expect(jurisdictions.length).toBe(2);
      expect(jurisdictions[0].convictionRate).toBe(0.6);
      expect(jurisdictions[1].convictionRate).toBe(0.5);
    });
  });

  describe('Export', () => {
    it('should export benchmark data as JSON', () => {
      const json = framework.exportBenchmarkData();
      const parsed = JSON.parse(json);
      expect(parsed.length).toBe(6);
      expect(parsed[0]).toHaveProperty('id', 'LA-County');
    });
  });
});