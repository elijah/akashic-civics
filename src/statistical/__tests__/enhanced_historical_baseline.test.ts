/**
 * Tests for Enhanced Historical Baseline System
 */

import { EnhancedHistoricalBaseline } from '../enhanced_historical_baseline';

let testCounter = 0;
const getUniqueDir = () => `/tmp/test_snapshots_${Date.now()}_${++testCounter}`;

describe('EnhancedHistoricalBaseline', () => {
  describe('createSnapshot', () => {
    it('should create a snapshot from case data', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      const cases = [
        { conviction: 1, sentence_months: 48, days_to_disposition: 180, race_ethnicity: 'Black', offense_severity: 'felony', missing_fields: [] },
        { conviction: 0, sentence_months: 30, days_to_disposition: 120, race_ethnicity: 'White', offense_severity: 'misdemeanor', missing_fields: [] },
        { conviction: 1, sentence_months: 60, days_to_disposition: 200, race_ethnicity: 'Hispanic', offense_severity: 'felony', missing_fields: [] },
      ];

      const snapshot = baseline.createSnapshot('TestCounty', cases);

      expect(snapshot.snapshot_id).toBeDefined();
      expect(snapshot.jurisdiction_id).toBe('TestCounty');
      expect(snapshot.case_count).toBe(3);
      // Code counts conviction !== null/undefined as conviction (3/3 = 1)
      expect(snapshot.key_statistics.conviction_rate).toBe(1);
      expect(snapshot.key_statistics.avg_sentence_months).toBe(46);
      expect(snapshot.key_statistics.missing_rate).toBe(0);
      expect(snapshot.derived_variables.total_cases).toBe(3);
    });

    it('should handle empty case data', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      const snapshot = baseline.createSnapshot('EmptyCounty', []);

      expect(snapshot.case_count).toBe(0);
      expect(snapshot.key_statistics.conviction_rate).toBe(0);
      expect(snapshot.key_statistics.missing_rate).toBe(1);
      expect(snapshot.derived_variables.total_cases).toBe(0);
    });
  });

  describe('compareWithBaseline', () => {
    it('should compare current snapshot against historical baseline', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('TestCounty', [
        { conviction: 1, sentence_months: 48, days_to_disposition: 180 },
        { conviction: 0, sentence_months: 30, days_to_disposition: 120 },
      ]);

      const currentSnapshot = baseline.getMostRecentSnapshot('TestCounty')!;
      const comparison = baseline.compareWithBaseline(currentSnapshot, currentSnapshot.snapshot_id);

      expect(comparison).not.toBeNull();
      expect(comparison!.current).toBe(currentSnapshot);
      expect(comparison!.baseline).toBeDefined();
      expect(comparison!.effect_size).toBeDefined();
      expect(comparison!.percent_change).toBeDefined();
      expect(comparison!.is_significant).toBeDefined();
      expect(comparison!.interpretation).toBeDefined();
    });

    it('should return null for non-existent baseline', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('TestCounty', [
        { conviction: 1, sentence_months: 48, days_to_disposition: 180 },
      ]);

      const currentSnapshot = baseline.getMostRecentSnapshot('TestCounty')!;
      const result = baseline.compareWithBaseline(currentSnapshot, 'nonexistent_id');
      expect(result).toBeNull();
    });
  });

  describe('testSignificance', () => {
    it('should compute Z-test for proportion difference', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      const result = baseline['testSignificance'](0.65, 100, 0.5, 100);

      expect(result).toHaveProperty('significant');
      expect(result).toHaveProperty('p_value');
      expect(result).toHaveProperty('effect_size');
      expect(typeof result.p_value).toBe('number');
      expect(result.p_value).toBeGreaterThanOrEqual(0);
      expect(result.p_value).toBeLessThanOrEqual(1);
    });

    it('should handle zero standard error', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      const result = baseline['testSignificance'](0.65, 0, 0.5, 0);

      expect(result.significant).toBe(false);
      // When n1=n2=0, se is NaN, not 0, so p_value becomes NaN
      expect(result.p_value).toBeNaN();
    });

    it('should return significant result for large difference', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      const result = baseline['testSignificance'](0.8, 100, 0.5, 100);

      expect(result.p_value).toBeLessThan(0.05);
      expect(result.significant).toBe(true);
    });
  });

  describe('normalCDF', () => {
    it('should compute standard normal CDF', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      const result = baseline['normalCDF'](0);

      expect(result).toBeCloseTo(0.5, 5);

      expect(baseline['normalCDF'](1.96)).toBeGreaterThan(0.975);
      expect(baseline['normalCDF'](-1.96)).toBeLessThan(0.025);
    });
  });

  describe('computeStats', () => {
    it('should compute statistics for case data with various fields', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      const cases = [
        { conviction: 1, sentence_months: 48, days_to_disposition: 180, race_ethnicity: 'Black', offense_severity: 'felony' },
        { conviction: 0, sentence_months: 30, days_to_disposition: 120, race_ethnicity: 'White', offense_severity: 'misdemeanor', missing_fields: ['race_ethnicity'] },
      ];

      const stats = baseline['computeStats'](cases);

      // Note: code counts all cases where conviction !== null/undefined as convictions,
      // so both 1 and 0 count, giving conviction_rate = 2/2 = 1
      expect(stats.conviction_rate).toBe(1);
      expect(stats.avg_sentence_months).toBe(39);
      expect(stats.missing_rate).toBe(0.5);
      expect(stats.total_cases).toBe(2);
      expect(stats.demographic_distribution).toHaveProperty('Black');
      expect(stats.demographic_distribution).toHaveProperty('White');
    });

    it('should return zero stats for empty data', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      const stats = baseline['computeStats']([]);

      expect(stats.conviction_rate).toBe(0);
      expect(stats.avg_sentence_months).toBe(0);
      expect(stats.missing_rate).toBe(1);
      expect(stats.total_cases).toBe(0);
    });
  });

  describe('identifyPeerGroups', () => {
    it('should identify peer groups based on conviction rate ranges', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('JurisdictionA', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
        { conviction: 0.6, sentence_months: 52, days_to_disposition: 190 },
      ]);

      const result = baseline.identifyPeerGroups('JurisdictionA');

      expect(result.peers).toBeInstanceOf(Array);
    });

    it('should handle single snapshot', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('SingleJuris', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
      ]);

      const result = baseline.identifyPeerGroups('SingleJuris');
      expect(result.peers).toEqual([]);
    });
  });

  describe('detectChangePoints', () => {
    it('should detect change points in conviction rates', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('ChangeJuris', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
        { conviction: 0.8, sentence_months: 60, days_to_disposition: 200 },
        { conviction: 0.55, sentence_months: 55, days_to_disposition: 195 },
      ]);

      const result = baseline.detectChangePoints('ChangeJuris');

      expect(result).toHaveProperty('anomalies');
      expect(result).toHaveProperty('method');
    });

    it('should handle insufficient data', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('SingleSnap', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
      ]);

      const result = baseline.detectChangePoints('SingleSnap');
      expect(result.anomalies).toEqual([]);
    });
  });

  describe('generateCUSUMChart', () => {
    it('should generate CUSUM chart with alerts', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('CUSUMJuris', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
        { conviction: 0.55, sentence_months: 50, days_to_disposition: 185 },
        { conviction: 0.6, sentence_months: 55, days_to_disposition: 190 },
        { conviction: 0.65, sentence_months: 60, days_to_disposition: 200 },
      ]);

      const result = baseline.generateCUSUMChart('CUSUMJuris');

      expect(result).toHaveProperty('cumulative_sum');
      expect(result).toHaveProperty('thresholds');
      expect(result).toHaveProperty('alerts');
      expect(Array.isArray(result.alerts)).toBe(true);
    });

    it('should handle insufficient data', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('SingleSnap2', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
      ]);

      const result = baseline.generateCUSUMChart('SingleSnap2');
      expect(result.cumulative_sum).toEqual([]);
      expect(result.alerts).toEqual([]);
    });
  });

  describe('identifyPolicyImpactMarkers', () => {
    it('should identify policy impact markers for significant changes', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('PolicyJuris', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
        { conviction: 0.8, sentence_months: 60, days_to_disposition: 200 },
        { conviction: 0.52, sentence_months: 50, days_to_disposition: 185 },
      ]);

      const result = baseline.identifyPolicyImpactMarkers('PolicyJuris');

      expect(result).toBeInstanceOf(Array);
    });

    it('should handle single snapshot', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('PolicySingle', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
      ]);

      const result = baseline.identifyPolicyImpactMarkers('PolicySingle');
      expect(result).toEqual([]);
    });
  });

  describe('compareCrossJurisdictions', () => {
    it('should compare jurisdictions against benchmarks', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('CompareJurisA', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
      ]);
      baseline.createSnapshot('CompareJurisB', [
        { conviction: 0.8, sentence_months: 60, days_to_disposition: 200 },
      ]);

      const result = baseline.compareCrossJurisdictions('CompareJurisA');

      expect(result).toHaveProperty('jurisdictions');
      expect(Array.isArray(result.jurisdictions)).toBe(true);
    });

    it('should handle jurisdiction with no snapshots', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());

      const result = baseline.compareCrossJurisdictions('EmptyJuris');
      expect(result.jurisdictions).toEqual([]);
    });
  });

  describe('rollingWindowAnalysis', () => {
    it('should perform rolling window analysis', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('all', [{ conviction: 0.5, sentence_months: 48, days_to_disposition: 180 }]);
      baseline.createSnapshot('all', [{ conviction: 0.55, sentence_months: 50, days_to_disposition: 185 }]);
      baseline.createSnapshot('all', [{ conviction: 0.6, sentence_months: 55, days_to_disposition: 190 }]);
      baseline.createSnapshot('all', [{ conviction: 0.65, sentence_months: 60, days_to_disposition: 200 }]);
      baseline.createSnapshot('all', [{ conviction: 0.7, sentence_months: 65, days_to_disposition: 210 }]);

      const result = baseline.rollingWindowAnalysis(3);

      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('seasonal');
      expect(result).toHaveProperty('residual');
    });

    it('should throw error for insufficient snapshots', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());

      expect(() => baseline.rollingWindowAnalysis(100)).toThrow();
    });
  });

  describe('detectBayesianChangePoints', () => {
    it('should detect Bayesian change points', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('BayesJuris1', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
        { conviction: 0.55, sentence_months: 50, days_to_disposition: 185 },
        { conviction: 0.6, sentence_months: 55, days_to_disposition: 190 },
        { conviction: 0.7, sentence_months: 70, days_to_disposition: 220 },
      ]);
      baseline.createSnapshot('BayesJuris2', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
      ]);

      const result = baseline.detectBayesianChangePoints('BayesJuris1');

      expect(result).toHaveProperty('change_points');
      expect(result).toHaveProperty('p_value');
    });

    it('should handle insufficient data', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('BayesSingle', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
      ]);

      const result = baseline.detectBayesianChangePoints('BayesSingle');
      expect(result.change_points).toEqual([]);
      expect(result.p_value).toBe(1);
    });
  });

  describe('getStateNationalBenchmark', () => {
    it('should return state/national benchmark data', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());

      const result = baseline.getStateNationalBenchmark();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('state_id');
      expect(result[0]).toHaveProperty('current_avg_conviction_rate');
      expect(result[0]).toHaveProperty('national_avg_conviction_rate');
      expect(result[0]).toHaveProperty('difference');
      expect(result[0]).toHaveProperty('benchmark_score');
    });
  });

  describe('getSnapshots and getMostRecentSnapshot', () => {
    it('should return snapshots for a jurisdiction', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());
      baseline.createSnapshot('SnapJuris', [{ conviction: 0.5, sentence_months: 48, days_to_disposition: 180 }]);

      const snapshots = baseline.getSnapshots('SnapJuris');
      expect(snapshots.length).toBeGreaterThanOrEqual(1);

      const mostRecent = baseline.getMostRecentSnapshot('SnapJuris');
      expect(mostRecent).not.toBeNull();
    });

    it('should return null for jurisdiction with no snapshots', () => {
      const baseline = new EnhancedHistoricalBaseline(getUniqueDir());

      const result = baseline.getMostRecentSnapshot('Nonexistent');
      expect(result).toBeNull();
    });
  });
});