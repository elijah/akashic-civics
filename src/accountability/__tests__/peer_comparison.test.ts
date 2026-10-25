/* ============================================================================
 * Peer Comparison Tests
 * ============================================================================ */

import {
  directStandardization,
  caseMixAdjustmentOLS,
  propensityScoreMatch,
  riskAdjustmentOLS,
  OfficerStats,
  PeerGroup,
} from '../peer_comparison';

describe('PeerComparison: directStandardization', () => {
  it('should compute standardized rate using population case mix', () => {
    const officerRates = { felony: 0.65, misdemeanor: 0.30 };
    const officerCaseCounts = { felony: 50, misdemeanor: 80 };
    const populationCaseMix = { felony: 40, misdemeanor: 60 };
    const populationRates = { felony: 0.55, misdemeanor: 0.25 };

    const result = directStandardization(officerRates, officerCaseCounts, populationCaseMix, populationRates);

    expect(result.standardizedRate).toBeGreaterThan(0);
    expect(result.standardizedRate).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.confidenceInterval)).toBe(true);
    expect(result.confidenceInterval.length).toBe(2);
  });

  it('should handle zero case counts gracefully', () => {
    const officerRates = { felony: 0.5 };
    const officerCaseCounts = { felony: 0 };
    const populationCaseMix = { felony: 50 };
    const populationRates = { felony: 0.3 };

    const result = directStandardization(officerRates, officerCaseCounts, populationCaseMix, populationRates);
    expect(result).toBeDefined();
  });
});

describe('PeerComparison: caseMixAdjustmentOLS', () => {
  it('should adjust raw rate using OLS regression with case-mix features', () => {
    const officerStats: OfficerStats = {
      officialId: 'officer-001',
      officialName: 'Test Officer',
      officialType: 'judge',
      jurisdictionId: 'TX-001',
      caseCount: 100,
      convictionCounts: { felony: 30, misdemeanor: 20 },
      convictionRates: { felony: 0.3, misdemeanor: 0.2 },
      disparityScores: { felony: 0.05, misdemeanor: -0.02 },
      caseMix: { felony: 40, misdemeanor: 35 },
    };

    const peerGroup: PeerGroup = {
      groupId: 'peer-001',
      groupName: 'Peer Group',
      jurisdictionId: 'TX-001',
      officers: [],
      populationCaseMix: { felony: 38, misdemeanor: 33 },
      populationConvictionRates: { felony: 0.35, misdemeanor: 0.22 },
      populationSize: 500,
    };

    const features = [
      { name: 'felony_cases', description: 'Proportion of felony cases' },
      { name: 'misdemeanor_cases', description: 'Proportion of misdemeanor cases' },
    ];

    const result = caseMixAdjustmentOLS(officerStats, peerGroup, features);

    expect(result).toBeDefined();
    expect(result.officerId).toBe('officer-001');
    expect(result.rawConvictionRate).toBeGreaterThan(0);
    expect(result.adjustedConvictionRate).toBeGreaterThanOrEqual(0);
    expect(result.adjustedConvictionRate).toBeLessThanOrEqual(1);
    expect(typeof result.adjustmentFactors).toBe('object');
  });

  it('should return raw rate when no peers available', () => {
    const officerStats: OfficerStats = {
      officialId: 'officer-001',
      officialName: 'Test Officer',
      officialType: 'judge',
      jurisdictionId: 'TX-001',
      caseCount: 10,
      convictionCounts: { felony: 3 },
      convictionRates: { felony: 0.3 },
      disparityScores: {},
      caseMix: { felony: 40 },
    };

    const peerGroup: PeerGroup = {
      groupId: 'peer-001',
      groupName: 'Peer Group',
      jurisdictionId: 'TX-001',
      officers: [],
      populationCaseMix: { felony: 38 },
      populationConvictionRates: { felony: 0.35 },
      populationSize: 500,
    };

    const features = [
      { name: 'felony_cases', description: 'Proportion of felony cases' },
    ];

    const result = caseMixAdjustmentOLS(officerStats, peerGroup, features);
    expect(result.rawConvictionRate).toBe(0.3);
    expect(result.adjustedConvictionRate).toBe(0.3);
  });
});

describe('PeerComparison: propensityScoreMatch', () => {
  it('should find nearest peers using cosine distance', () => {
    const targetOfficer: OfficerStats = {
      officialId: 'officer-001',
      officialName: 'Target Officer',
      officialType: 'judge',
      jurisdictionId: 'TX-001',
      caseCount: 50,
      convictionCounts: { felony: 15 },
      convictionRates: { felony: 0.3 },
      disparityScores: {},
      caseMix: { felony: 40, misdemeanor: 30 },
    };

    const peerGroup: PeerGroup = {
      groupId: 'peer-001',
      groupName: 'Peer Group',
      jurisdictionId: 'TX-001',
      officers: [
        {
          officialId: 'peer-002',
          officialName: 'Peer 2',
          officialType: 'judge',
          jurisdictionId: 'TX-001',
          caseCount: 50,
          convictionCounts: { felony: 16 },
          convictionRates: { felony: 0.32 },
          disparityScores: {},
          caseMix: { felony: 38, misdemeanor: 32 },
        },
        {
          officialId: 'peer-003',
          officialName: 'Peer 3',
          officialType: 'judge',
          jurisdictionId: 'TX-001',
          caseCount: 60,
          convictionCounts: { felony: 20 },
          convictionRates: { felony: 0.33 },
          disparityScores: {},
          caseMix: { felony: 42, misdemeanor: 28 },
        },
      ],
      populationCaseMix: { felony: 39, misdemeanor: 31 },
      populationConvictionRates: { felony: 0.34, misdemeanor: 0.23 },
      populationSize: 600,
    };

    const result = propensityScoreMatch(targetOfficer, peerGroup, ['caseCount', 'felony']);

    expect(result).toBeDefined();
    expect(result.targetOfficerId).toBe('officer-001');
    expect(Array.isArray(result.matchedPeers)).toBe(true);
    expect(result.matchedPeers.length).toBeGreaterThanOrEqual(0);
    expect(result.propensityScore).toBeGreaterThanOrEqual(0);
    expect(result.propensityScore).toBeLessThanOrEqual(1);
    expect(result.similarityScore).toBeGreaterThanOrEqual(0);
    expect(result.similarityScore).toBeLessThanOrEqual(1);
  });

  it('should return empty when no peers in group', () => {
    const targetOfficer: OfficerStats = {
      officialId: 'officer-001',
      officialName: 'Target Officer',
      officialType: 'judge',
      jurisdictionId: 'TX-001',
      caseCount: 50,
      convictionCounts: { felony: 15 },
      convictionRates: { felony: 0.3 },
      disparityScores: {},
      caseMix: { felony: 40 },
    };

    const peerGroup: PeerGroup = {
      groupId: 'peer-001',
      groupName: 'Peer Group',
      jurisdictionId: 'TX-001',
      officers: [],
      populationCaseMix: { felony: 38 },
      populationConvictionRates: { felony: 0.35 },
      populationSize: 500,
    };

    const result = propensityScoreMatch(targetOfficer, peerGroup, ['caseCount']);
    expect(result.matchedPeers).toEqual([]);
    expect(result.propensityScore).toBe(0);
  });
});

describe('PeerComparison: riskAdjustmentOLS', () => {
  it('should compute risk-adjusted rate using OLS with controls', () => {
    const targetOfficer: OfficerStats = {
      officialId: 'officer-001',
      officialName: 'Test Officer',
      officialType: 'judge',
      jurisdictionId: 'TX-001',
      caseCount: 100,
      convictionCounts: { felony: 30 },
      convictionRates: { felony: 0.3 },
      disparityScores: {},
      caseMix: { felony: 40, misdemeanor: 35 },
    };

    const peerGroup: PeerGroup = {
      groupId: 'peer-001',
      groupName: 'Peer Group',
      jurisdictionId: 'TX-001',
      officers: [
        {
          officialId: 'peer-002',
          officialName: 'Peer 2',
          officialType: 'judge',
          jurisdictionId: 'TX-001',
          caseCount: 80,
          convictionCounts: { felony: 20 },
          convictionRates: { felony: 0.25 },
          disparityScores: {},
          caseMix: { felony: 38, misdemeanor: 32 },
        },
      ],
      populationCaseMix: { felony: 39, misdemeanor: 31 },
      populationConvictionRates: { felony: 0.33, misdemeanor: 0.22 },
      populationSize: 500,
    };

    const controlFeatures = [
      { name: 'felony_cases', description: 'Proportion of felony cases' },
      { name: 'misdemeanor_cases', description: 'Proportion of misdemeanor cases' },
    ];

    const result = riskAdjustmentOLS(targetOfficer, peerGroup, controlFeatures);

    expect(result).toBeDefined();
    expect(result.officerId).toBe('officer-001');
    expect(result.rawRate).toBe(0.3);
    expect(typeof result.adjustedRate).toBe('number');
    expect(typeof result.adjustmentExplanation).toBe('string');
    expect(typeof result.modelFit).toBe('object');
    expect('rSquared' in result.modelFit).toBe(true);
  });
});