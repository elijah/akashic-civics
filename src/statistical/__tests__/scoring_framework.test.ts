import {
  CredibilityLevel,
  TestName,
  TestWeightConfig,
  ScoringConfig,
  DisconfirmationScore,
  TestResult,
  TestScore,
  DEFAULT_SCORING_CONFIG,
  scoreTest,
  computeDisconfirmationScore,
  determineTier,
  createScoringConfig,
  createUniformConfig
} from '../scoring_framework';

describe('Weighted Disconfirmation Scoring Framework', () => {
  describe('CredibilityLevel enum', () => {
    test('has all expected levels', () => {
      expect(CredibilityLevel.HIGH).toBe('high');
      expect(CredibilityLevel.QUALIFIED).toBe('qualified');
      expect(CredibilityLevel.TENTATIVE).toBe('tentative');
      expect(CredibilityLevel.WEAK).toBe('weak');
      expect(CredibilityLevel.NOT_CREDIBLE).toBe('not_credible');
    });
  });

  describe('TestName enum', () => {
    test('has all expected test names', () => {
      expect(TestName.PLACEBO).toBe('placebo');
      expect(TestName.SPEC_SENSITIVITY).toBe('spec_sensitivity');
      expect(TestName.NEGATIVE_CONTROLS).toBe('negative_controls');
      expect(TestName.OUT_OF_SAMPLE).toBe('out_of_sample');
      expect(TestName.TEMPORAL_ROBUSTNESS).toBe('temporal_robustness');
      expect(TestName.ALTERNATIVE_EXPLANATIONS).toBe('alternative_explanations');
    });
  });

  describe('TestWeightConfig', () => {
    test('can be created with valid values', () => {
      const config: TestWeightConfig = {
        test: TestName.PLACEBO,
        weight: 0.25,
        description: 'Foundational test',
        fullCredit: 1.0,
        zeroCredit: 0.0
      };
      expect(config.test).toBe(TestName.PLACEBO);
      expect(config.weight).toBe(0.25);
    });
  });

  describe('ScoringConfig', () => {
    test('DEFAULT_SCORING_CONFIG is valid', () => {
      expect(DEFAULT_SCORING_CONFIG.tests).toHaveLength(6);
      expect(DEFAULT_SCORING_CONFIG.tiers).toBeDefined();
      expect(DEFAULT_SCORING_CONFIG.notRunScore).toBeDefined();
      expect(DEFAULT_SCORING_CONFIG.excludeNotRunFromDenominator).toBeDefined();
    });

    test('createUniformConfig creates valid config', () => {
      const config = createUniformConfig([TestName.PLACEBO, TestName.SPEC_SENSITIVITY]);
      expect(config.tests).toHaveLength(2);
      expect(config.tiers).toBeDefined();
    });

    test('createScoringConfig constructs valid config from test weights', () => {
      const weights: TestWeightConfig[] = [
        { test: TestName.PLACEBO, weight: 0.5, description: 'Placebo', fullCredit: 1.0, zeroCredit: 0.0 },
        { test: TestName.SPEC_SENSITIVITY, weight: 0.5, description: 'Spec', fullCredit: 1.0, zeroCredit: 0.0 }
      ];
      const config = createScoringConfig(weights);
      expect(config.tests).toHaveLength(2);
      expect(config.tests[0].test).toBe(TestName.PLACEBO);
      expect(config.tiers.length).toBe(5);
    });

    test('TestScore interface has expected fields', () => {
      const mockScore: TestScore = {
        test: TestName.PLACEBO,
        score: 0.9,
        weight: 0.25,
        weightedScore: 0.225,
        passed: true,
        derivation: 'p-value test',
        interpretation: 'Strong pass'
      };
      expect(mockScore.test).toBe(TestName.PLACEBO);
      expect(mockScore.weightedScore).toBe(0.225);
    });

    test('DisconfirmationScore interface has expected fields', () => {
      const mockScore: DisconfirmationScore = {
        overall: 0.8,
        tier: CredibilityLevel.HIGH,
        tierLabel: 'High',
        tierInterpretation: 'test',
        tierAction: 'report',
        breakdown: [],
        testsRun: 6,
        testsSkipped: 0,
        coverage: 1.0,
        recommendations: [],
        criticalFailures: [],
        reportable: true
      };
      expect(mockScore.tier).toBe(CredibilityLevel.HIGH);
      expect(mockScore.reportable).toBe(true);
    });
  });

  describe('scoreTest', () => {
    test('computes a score for a basic test', () => {
      const result = scoreTest({
        test: TestName.PLACEBO,
        passed: true,
        scoreOverride: undefined,
        evidence: { pValue: 0.3 }
      }, DEFAULT_SCORING_CONFIG);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.passed).toBe(true);
    });

    test('handles failed test with override', () => {
      const result = scoreTest({
        test: TestName.PLACEBO,
        passed: false,
        scoreOverride: 0.0,
        evidence: { pValue: 0.95 }
      }, DEFAULT_SCORING_CONFIG);
      expect(result.score).toBe(0.0);
      expect(result.passed).toBe(false);
    });
  });

  describe('computeDisconfirmationScore', () => {
    test('computes aggregate score from test results', () => {
      const testResults: TestResult[] = [
        { test: TestName.PLACEBO, passed: true, evidence: { pValue: 0.3 } },
        { test: TestName.SPEC_SENSITIVITY, passed: true, evidence: { pValue: 0.02 } },
        { test: TestName.NEGATIVE_CONTROLS, passed: true, evidence: { pValue: 0.2 } },
        { test: TestName.OUT_OF_SAMPLE, passed: false, evidence: { pValue: 0.8 } },
        { test: TestName.TEMPORAL_ROBUSTNESS, passed: true, evidence: { pValue: 0.1 } },
        { test: TestName.ALTERNATIVE_EXPLANATIONS, passed: true, evidence: { pValue: 0.01 } }
      ];

      const score = computeDisconfirmationScore(testResults, DEFAULT_SCORING_CONFIG);
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(1);
      expect(score.tier).toBeDefined();
      expect(score.tierLabel).toBeDefined();
      expect(score.breakdown).toHaveLength(6);
      expect(score.testsRun).toBe(6);
      expect(score.criticalFailures).toBeDefined();
    });

    test('handles partially passed tests', () => {
      const testResults: TestResult[] = [
        { test: TestName.PLACEBO, passed: true, evidence: { pValue: 0.3 } },
        { test: TestName.SPEC_SENSITIVITY, passed: false, scoreOverride: 0.3, evidence: { pValue: 0.95 } },
        { test: TestName.NEGATIVE_CONTROLS, passed: true, evidence: { pValue: 0.2 } },
        { test: TestName.OUT_OF_SAMPLE, passed: false, evidence: { pValue: 0.8 } },
        { test: TestName.TEMPORAL_ROBUSTNESS, passed: true, evidence: { pValue: 0.1 } },
        { test: TestName.ALTERNATIVE_EXPLANATIONS, passed: true, evidence: { pValue: 0.01 } }
      ];

      const score = computeDisconfirmationScore(testResults, DEFAULT_SCORING_CONFIG);
      expect(score.overall).toBeGreaterThan(0);
      expect(score.overall).toBeLessThan(1);
    });
  });

  describe('determineTier', () => {
    test('returns HIGH for high scores', () => {
      const tier = determineTier(0.95, DEFAULT_SCORING_CONFIG);
      expect(tier.tier).toBe(CredibilityLevel.HIGH);
      expect(tier.label).toBe('Highly Credible');
    });

    test('returns WEAK for low scores', () => {
      const tier = determineTier(0.50, DEFAULT_SCORING_CONFIG);
      expect(tier.tier).toBe(CredibilityLevel.WEAK);
      expect(tier.label).toBe('Weak');
    });

    test('returns NOT_CREDIBLE for very low scores', () => {
      const tier = determineTier(0.15, DEFAULT_SCORING_CONFIG);
      expect(tier.tier).toBe(CredibilityLevel.NOT_CREDIBLE);
      expect(tier.label).toBe('Not Credible');
    });

    test('returns correct tier within configured ranges', () => {
      const config: ScoringConfig = {
        tests: DEFAULT_SCORING_CONFIG.tests,
        notRunScore: 0.5,
        excludeNotRunFromDenominator: true,
        tiers: [
          { tier: CredibilityLevel.HIGH, minScore: 0.8, maxScore: 1.0, label: 'High', interpretation: 'HI', action: 'HA' },
          { tier: CredibilityLevel.QUALIFIED, minScore: 0.6, maxScore: 0.8, label: 'Qualified', interpretation: 'QU', action: 'QUA' },
          { tier: CredibilityLevel.TENTATIVE, minScore: 0.4, maxScore: 0.6, label: 'Tentative', interpretation: 'TE', action: 'TEA' },
          { tier: CredibilityLevel.WEAK, minScore: 0.2, maxScore: 0.4, label: 'Weak', interpretation: 'WE', action: 'WEA' },
          { tier: CredibilityLevel.NOT_CREDIBLE, minScore: 0.0, maxScore: 0.2, label: 'Not Credible', interpretation: 'NC', action: 'NCA' }
        ]
      };

      expect(determineTier(0.9, config).tier).toBe(CredibilityLevel.HIGH);
      expect(determineTier(0.7, config).tier).toBe(CredibilityLevel.QUALIFIED);
      expect(determineTier(0.5, config).tier).toBe(CredibilityLevel.TENTATIVE);
      expect(determineTier(0.3, config).tier).toBe(CredibilityLevel.WEAK);
      expect(determineTier(0.1, config).tier).toBe(CredibilityLevel.NOT_CREDIBLE);
    });
  });
});