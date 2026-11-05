/**
 * Tests for Comparison Framework
 */

import { 
  compareJurisdictionAgainstNational,
  identifyPeerGroups,
  getStateNationalBenchmark,
  CrossJurisdictionalComparison,
  StateNationalBenchmark,
  PeerGroupIdentification
} from '../comparison_framework';

import { EnhancedHistoricalBaseline } from '../enhanced_historical_baseline';

describe('Comparison Framework', () => {
  describe('getStateNationalBenchmark', () => {
    it('should return array of state/national benchmarks', () => {
      const result = getStateNationalBenchmark();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const usa = result.find(s => s.state_id === 'USA');
      expect(usa).toBeDefined();
      expect(usa!.national_avg_conviction_rate).toBeDefined();
      expect(usa!.current_avg_conviction_rate).toBeDefined();
      expect(typeof usa!.difference).toBe('number');
      expect(typeof usa!.benchmark_score).toBe('number');
    });

    it('should include key states', () => {
      const result = getStateNationalBenchmark();

      const states = result.map(s => s.state_id);
      expect(states).toContain('USA');
      expect(states).toContain('California');
      expect(states).toContain('Texas');
      expect(states).toContain('New York');
    });
  });

  describe('identifyPeerGroups', () => {
    it('should identify peer groups for a jurisdiction', () => {
      // Create a baseline with multiple snapshots inline
      const testDir = `/tmp/test_peer_groups_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const baseline = new EnhancedHistoricalBaseline(testDir);
      baseline.createSnapshot('JurisA', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180, race_ethnicity: 'Black', offense_severity: 'felony' },
        { conviction: 0.55, sentence_months: 50, days_to_disposition: 185, race_ethnicity: 'White', offense_severity: 'felony' },
      ]);
      baseline.createSnapshot('JurisB', [
        { conviction: 0.45, sentence_months: 42, days_to_disposition: 170, race_ethnicity: 'Hispanic', offense_severity: 'misdemeanor' },
        { conviction: 0.5, sentence_months: 45, days_to_disposition: 175, race_ethnicity: 'Black', offense_severity: 'misdemeanor' },
      ]);
      baseline.createSnapshot('JurisC', [
        { conviction: 0.8, sentence_months: 72, days_to_disposition: 240, race_ethnicity: 'Black', offense_severity: 'felony' },
        { conviction: 0.75, sentence_months: 70, days_to_disposition: 230, race_ethnicity: 'White', offense_severity: 'felony' },
      ]);

      const result = identifyPeerGroups(baseline, 'JurisA');

      expect(result).toHaveProperty('peers');
      expect(Array.isArray(result.peers)).toBe(true);
    });

    it('should return empty peers for jurisdiction with single snapshot', () => {
      // Create a fresh baseline; getSnapshots filters by jurisdiction_id
      const testDir = `/tmp/test_single_peer_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const baseline = new EnhancedHistoricalBaseline(testDir);
      baseline.createSnapshot('SingleJuris', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
      ]);

      // Verify only one snapshot exists for this jurisdiction
      const snapshots = baseline.getSnapshots('SingleJuris');
      expect(snapshots.length).toBe(1);

      const result = identifyPeerGroups(baseline, 'SingleJuris');
      // With only 1 snapshot, no peer groups can be formed
      expect(result.peers.length).toBe(0);
    });

    it('should group jurisdictions by conviction rate ranges', () => {
      const testDir = `/tmp/test_group_peer_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const baseline = new EnhancedHistoricalBaseline(testDir);
      baseline.createSnapshot('JurisHigh', [
        { conviction: 0.8, sentence_months: 72, days_to_disposition: 240 },
        { conviction: 0.75, sentence_months: 70, days_to_disposition: 230 },
      ]);
      baseline.createSnapshot('JurisMedium', [
        { conviction: 0.5, sentence_months: 48, days_to_disposition: 180 },
        { conviction: 0.55, sentence_months: 50, days_to_disposition: 185 },
      ]);
      baseline.createSnapshot('JurisLow', [
        { conviction: 0.3, sentence_months: 30, days_to_disposition: 120 },
        { conviction: 0.25, sentence_months: 28, days_to_disposition: 115 },
      ]);

      const result = identifyPeerGroups(baseline, 'JurisHigh');

      expect(result.peers.length).toBeGreaterThan(0);
      
      result.peers.forEach(peer => {
        expect(peer).toHaveProperty('group_id');
        expect(peer).toHaveProperty('average_conviction_rate');
        expect(peer).toHaveProperty('average_sentence_months');
        expect(peer).toHaveProperty('demographic_profile');
      });
    });
  });

  describe('compareJurisdictionAgainstNational', () => {
    it('should compare jurisdiction against national benchmarks', () => {
      const baseline = new EnhancedHistoricalBaseline('/tmp/test');
      baseline.createSnapshot('CompJuris', [
        { conviction: 0.65, sentence_months: 54, days_to_disposition: 190, race_ethnicity: 'Black', offense_severity: 'felony' },
        { conviction: 0.7, sentence_months: 58, days_to_disposition: 200, race_ethnicity: 'White', offense_severity: 'misdemeanor' },
      ]);

      const result = compareJurisdictionAgainstNational(baseline, 'CompJuris');

      expect(result).toHaveProperty('jurisdictions');
      expect(result.jurisdictions.length).toBe(1);

      const jurisdiction = result.jurisdictions[0];
      expect(jurisdiction.jurisdiction_id).toBe('CompJuris');
      expect(jurisdiction).toHaveProperty('current_stats');
      expect(jurisdiction).toHaveProperty('national_comparison');
    });

    it('should include states in national comparison', () => {
      const baseline = new EnhancedHistoricalBaseline('/tmp/test');
      baseline.createSnapshot('CompJuris', [
        { conviction: 0.65, sentence_months: 54, days_to_disposition: 190 },
      ]);

      const result = compareJurisdictionAgainstNational(baseline, 'CompJuris');

      const nationalComp = result.jurisdictions[0].national_comparison;
      expect(nationalComp).toHaveProperty('states');
      expect(nationalComp.states.length).toBeGreaterThan(0);
      expect(nationalComp).toHaveProperty('difference');
      expect(nationalComp).toHaveProperty('benchmark_score');
    });

    it('should handle jurisdiction with no snapshots', () => {
      const baseline = new EnhancedHistoricalBaseline('/tmp/test');

      const result = compareJurisdictionAgainstNational(baseline, 'EmptyJuris');

      expect(result.jurisdictions[0].jurisdiction_id).toBe('EmptyJuris');
    });
  });

  describe('Type definitions', () => {
    it('should have CrossJurisdictionalComparison interface', () => {
      const result: CrossJurisdictionalComparison = {
        jurisdictions: [
          {
            jurisdiction_id: 'test',
            current_stats: {},
            national_comparison: {
              states: [],
              difference: 0,
              benchmark_score: 0
            }
          }
        ]
      };

      expect(result.jurisdictions[0].jurisdiction_id).toBe('test');
    });

    it('should have StateNationalBenchmark interface', () => {
      const benchmark: StateNationalBenchmark = {
        state_id: 'TestState',
        current_avg_conviction_rate: 0.05,
        national_avg_conviction_rate: 0.03,
        difference: 0.02,
        benchmark_score: 0.9
      };

      expect(benchmark.difference).toBeCloseTo(
        benchmark.current_avg_conviction_rate - benchmark.national_avg_conviction_rate,
        6
      );
    });

    it('should have PeerGroupIdentification interface', () => {
      const peers: PeerGroupIdentification = {
        peers: [
          {
            group_id: 'group_1',
            average_conviction_rate: 0.55,
            average_sentence_months: 50,
            demographic_profile: { White: 0.5, Black: 0.5 }
          }
        ]
      };

      expect(peers.peers.length).toBe(1);
      expect(peers.peers[0].average_conviction_rate).toBeCloseTo(0.55, 2);
    });
  });
});