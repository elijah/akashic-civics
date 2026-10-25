/**
 * Weighted Disconfirmation Scoring Framework
 * 
 * Aggregates individual disconfirmation test results into a graded credibility
 * score. Preserves information about near-misses that binary pass/fail discards,
 * and produces tiered interpretations with actionable recommendations.
 */

import { TestName } from './adaptive_disconfirmation';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Per-test configuration: weight and how to score partial results
 */
export interface TestWeightConfig {
  test: TestName;
  weight: number;
  description: string;
  /** Minimum score for a full pass (typically 1.0) */
  fullCredit: number;
  /** Score for a hard failure */
  zeroCredit: number;
}

/**
 * Scoring configuration for the full protocol
 */
export interface ScoringConfig {
  tests: TestWeightConfig[];
  /** Score for tests that were not run (neither credit nor penalty) */
  notRunScore: number;
  /** Whether skipped tests reduce the denominator */
  excludeNotRunFromDenominator: boolean;
  /** Credibility tier thresholds, ordered high to low */
  tiers: CredibilityTier[];
}

/**
 * A credibility tier with its interpretation and required action
 */
export interface CredibilityTier {
  tier: CredibilityLevel;
  minScore: number;
  maxScore: number;
  label: string;
  interpretation: string;
  action: string;
}

export enum CredibilityLevel {
  HIGH = 'high',
  QUALIFIED = 'qualified',
  TENTATIVE = 'tentative',
  WEAK = 'weak',
  NOT_CREDIBLE = 'not_credible'
}

// ============================================================================
// Results
// ============================================================================

/**
 * Result of a single test, with the components needed for graded scoring
 */
export interface TestResult {
  test: TestName;
  passed: boolean;
  /** Raw evidence from the test, e.g. p-value, consistency count */
  evidence?: {
    pValue?: number;
    effectSize?: number;
    consistentCount?: number;
    totalCount?: number;
    significantPeriods?: number;
    totalPeriods?: number;
    supportedExplanations?: string[];
    [key: string]: any;
  };
  /** Optional manual override of the computed score (0-1) */
  scoreOverride?: number;
  notes?: string;
}

/**
 * Score for a single test with explanation of how it was derived
 */
export interface TestScore {
  test: TestName;
  score: number;
  weight: number;
  weightedScore: number;
  passed: boolean;
  /** How the score was derived */
  derivation: string;
  /** Explanation of what this score means */
  interpretation: string;
  notes?: string;
}

/**
 * Aggregate scoring result
 */
export interface DisconfirmationScore {
  overall: number;
  tier: CredibilityLevel;
  tierLabel: string;
  tierInterpretation: string;
  tierAction: string;
  breakdown: TestScore[];
  testsRun: number;
  testsSkipped: number;
  /** Fraction of weight that was actually evaluated */
  coverage: number;
  /** Recommendation strings */
  recommendations: string[];
  /** Set of test names that failed outright */
  criticalFailures: TestName[];
  /** Whether the finding passed the minimum bar for reporting */
  reportable: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default weights. Rationale for the relative weights:
 * - Placebo (0.25): Foundational. If the methodology has false positive bias,
 *   nothing else means anything.
 * - Alternative explanations (0.20): The core causal test. Does the actual
 *   epistemic work of distinguishing bias from other causes.
 * - Negative controls (0.15): Distinguishes signal from artifact. Without it,
 *   we cannot tell a real effect from a pipeline defect.
 * - Specification sensitivity (0.15): Detects analytical fragility.
 * - Out-of-sample (0.15): Detects overfitting, provides replication evidence.
 * - Temporal robustness (0.10): Detects transient artifacts.
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  tests: [
    {
      test: TestName.PLACEBO,
      weight: 0.25,
      description: 'Methodology calibration against known nulls',
      fullCredit: 1.0,
      zeroCredit: 0.0
    },
    {
      test: TestName.ALTERNATIVE_EXPLANATIONS,
      weight: 0.20,
      description: 'Causal specificity - what else could explain this',
      fullCredit: 1.0,
      zeroCredit: 0.0
    },
    {
      test: TestName.NEGATIVE_CONTROLS,
      weight: 0.15,
      description: 'Signal versus methodological artifact',
      fullCredit: 1.0,
      zeroCredit: 0.0
    },
    {
      test: TestName.SPEC_SENSITIVITY,
      weight: 0.15,
      description: 'Robustness to analytical choices',
      fullCredit: 1.0,
      zeroCredit: 0.0
    },
    {
      test: TestName.OUT_OF_SAMPLE,
      weight: 0.15,
      description: 'Generalization beyond estimation sample',
      fullCredit: 1.0,
      zeroCredit: 0.0
    },
    {
      test: TestName.TEMPORAL_ROBUSTNESS,
      weight: 0.10,
      description: 'Persistence across time periods',
      fullCredit: 1.0,
      zeroCredit: 0.0
    }
  ],
  notRunScore: 0.5,
  excludeNotRunFromDenominator: true,
  tiers: [
    {
      tier: CredibilityLevel.HIGH,
      minScore: 0.90,
      maxScore: 1.01,
      label: 'Highly Credible',
      interpretation:
        'The finding survived every disconfirmation test that could be run on the ' +
        'available data. It is robust to the known threats to validity and no tested ' +
        'alternative explanation accounts for the effect.',
      action:
        'Report with confidence. Suitable for policy recommendation, public reporting, ' +
        'and use in adversarial settings where the finding will be challenged.'
    },
    {
      tier: CredibilityLevel.QUALIFIED,
      minScore: 0.75,
      maxScore: 0.90,
      label: 'Credible with Qualifications',
      interpretation:
        'The finding survived the great majority of disconfirmation tests, with limited ' +
        'shortcomings that do not undermine the central claim but constrain its strength.',
      action:
        'Report with explicit qualifications naming the specific limitations. Recommend ' +
        'but do not require action; flag for further validation in future cycles.'
    },
    {
      tier: CredibilityLevel.TENTATIVE,
      minScore: 0.60,
      maxScore: 0.75,
      label: 'Tentative',
      interpretation:
        'The finding survived a majority of the applicable tests but shows meaningful ' +
        'vulnerability to at least one threat to validity.',
      action:
        'Do not base policy on this finding. Report as preliminary and hypothesis-' +
        'generating. Prioritize the failing test for remediation in the next analysis cycle.'
    },
    {
      tier: CredibilityLevel.WEAK,
      minScore: 0.40,
      maxScore: 0.60,
      label: 'Weak',
      interpretation:
        'The finding failed multiple disconfirmation tests. The observed disparity is ' +
        'more plausibly explained by methodology, artifacts, or alternative mechanisms ' +
        'than by the hypothesized cause.',
      action:
        'Do not report as a finding. Investigate the failing tests to determine whether ' +
        'the weakness lies in the data, the model, or the claim itself.'
    },
    {
      tier: CredibilityLevel.NOT_CREDIBLE,
      minScore: 0.0,
      maxScore: 0.40,
      label: 'Not Credible',
      interpretation:
        'The finding failed foundational disconfirmation tests. Reported results from ' +
        'this pipeline would be unreliable.',
      action:
        'Do not report any findings from this analysis. Correct the methodology and ' +
        're-run the full protocol before producing any interpretation.'
    }
  ]
};

// ============================================================================
// Scoring Engine
// ============================================================================

/**
 * Compute the graded score for a single test result
 *
 * Partial credit rules:
 * - Placebo: p >= 0.05 full credit; near-threshold p values get partial credit;
 *   p < 0.01 is a hard failure (clear false positive signal).
 * - Specification: credit proportional to fraction of consistent specifications.
 * - Out-of-sample: credit based on effect size stability within tolerance.
 * - Temporal: credit based on fraction of periods with consistent direction.
 * - Negative controls / Alternative explanations: credit based on how many
 *   alternatives remain unsupported.
 */
export function scoreTest(
  result: TestResult,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): TestScore {
  const weightConfig = config.tests.find(t => t.test === result.test);
  const weight = weightConfig?.weight ?? 0;

  // Manual override takes precedence
  if (result.scoreOverride !== undefined) {
    const clamped = Math.max(0, Math.min(1, result.scoreOverride));
    return {
      test: result.test,
      score: clamped,
      weight,
      weightedScore: clamped * weight,
      passed: clamped >= 0.5,
      derivation: 'Manual score override supplied by caller',
      interpretation: describeScore(clamped),
      notes: result.notes
    };
  }

  const { score, derivation } = computeTestScore(result);

  return {
    test: result.test,
    score,
    weight,
    weightedScore: score * weight,
    passed: result.passed,
    derivation,
    interpretation: describeScore(score),
    notes: result.notes
  };
}

/**
 * Compute the graded score for a test based on its evidence
 */
function computeTestScore(result: TestResult): { score: number; derivation: string } {
  const ev = result.evidence ?? {};

  switch (result.test) {
    case TestName.PLACEBO: {
      // A placebo should show NO significant effect.
      // p >= 0.05 → full credit. p near threshold → partial.
      if (ev.pValue === undefined) {
        return {
          score: result.passed ? 1.0 : 0.0,
          derivation: result.passed
            ? 'Placebo showed no significant effect'
            : 'Placebo showed a significant effect'
        };
      }
      const p = ev.pValue;
      if (p >= 0.05) {
        // Further from the threshold = more confidence
        const score = p >= 0.20 ? 1.0 : 0.85 + (p - 0.05) / 0.15 * 0.15;
        return {
          score,
          derivation: `Placebo p-value ${p.toFixed(4)} is above the 0.05 threshold ` +
            `(${p >= 0.20 ? 'comfortably' : 'marginally'})`
        };
      }
      if (p >= 0.01) {
        // Near miss: 0.01-0.05 is a marginal false positive signal
        return {
          score: 0.4,
          derivation: `Placebo p-value ${p.toFixed(4)} is below 0.05 but above 0.01; ` +
            'a marginal false positive signal that warrants investigation'
        };
      }
      return {
        score: 0.0,
        derivation: `Placebo p-value ${p.toFixed(4)} is below 0.01; clear false positive bias`
      };
    }

    case TestName.SPEC_SENSITIVITY: {
      if (ev.consistentCount !== undefined && ev.totalCount !== undefined && ev.totalCount > 0) {
        const ratio = ev.consistentCount / ev.totalCount;
        const score = ratio >= 0.8 ? 1.0 : ratio * 0.9;
        return {
          score,
          derivation: `${ev.consistentCount}/${ev.totalCount} alternative specifications ` +
            `were consistent (${(ratio * 100).toFixed(0)}%)`
        };
      }
      return {
        score: result.passed ? 1.0 : 0.0,
        derivation: result.passed
          ? 'Effect direction and significance consistent across specifications'
          : 'Effect inconsistent across specifications'
      };
    }

    case TestName.NEGATIVE_CONTROLS: {
      if (ev.supportedExplanations !== undefined) {
        // Fewer supported explanations is better
        const count = ev.supportedExplanations.length;
        return {
          score: count === 0 ? 1.0 : Math.max(0, 1 - count * 0.34),
          derivation: count === 0
            ? 'No negative control showed a spurious effect'
            : `${count} negative control(s) showed spurious effects: ${ev.supportedExplanations.join(', ')}`
        };
      }
      return {
        score: result.passed ? 1.0 : 0.0,
        derivation: result.passed
          ? 'Main effect significant while negative controls were not'
          : 'Main and negative control results are inconsistent'
      };
    }

    case TestName.OUT_OF_SAMPLE: {
      if (ev.effectSize !== undefined) {
        // effectSize here represents the relative difference between train and test
        const tolerance = 0.20;
        const diff = Math.abs(ev.effectSize);
        if (diff <= tolerance * 0.5) {
          return {
            score: 1.0,
            derivation: `Out-of-sample effect differs by ${(diff * 100).toFixed(1)}% from ` +
              'the estimation sample, well within tolerance'
          };
        }
        if (diff <= tolerance) {
          return {
            score: 0.75,
            derivation: `Out-of-sample effect differs by ${(diff * 100).toFixed(1)}% from ` +
              'the estimation sample, within the 20% tolerance'
          };
        }
        const score = Math.max(0, 1 - (diff - tolerance) / tolerance);
        return {
          score,
          derivation: `Out-of-sample effect differs by ${(diff * 100).toFixed(1)}%, ` +
            'exceeding the 20% tolerance'
        };
      }
      return {
        score: result.passed ? 1.0 : 0.0,
        derivation: result.passed
          ? 'Effect replicated in the holdout sample'
          : 'Effect did not replicate in the holdout sample'
      };
    }

    case TestName.TEMPORAL_ROBUSTNESS: {
      if (ev.significantPeriods !== undefined && ev.totalPeriods !== undefined && ev.totalPeriods > 0) {
        const ratio = ev.significantPeriods / ev.totalPeriods;
        const score = ratio >= 0.75 ? 1.0 : ratio >= 0.5 ? 0.6 + (ratio - 0.5) * 0.8 : ratio;
        return {
          score,
          derivation: `${ev.significantPeriods}/${ev.totalPeriods} time periods showed ` +
            `the effect with consistent direction (${(ratio * 100).toFixed(0)}%)`
        };
      }
      return {
        score: result.passed ? 1.0 : 0.0,
        derivation: result.passed
          ? 'Effect direction consistent across all time periods'
          : 'Effect direction varies across time periods'
      };
    }

    case TestName.ALTERNATIVE_EXPLANATIONS: {
      if (ev.supportedExplanations !== undefined) {
        const count = ev.supportedExplanations.length;
        const score = count === 0 ? 1.0 : Math.max(0, 1 - count * 0.25);
        return {
          score,
          derivation: count === 0
            ? 'No alternative explanation was supported by the data'
            : `${count} alternative explanation(s) were supported: ${ev.supportedExplanations.join(', ')}`
        };
      }
      return {
        score: result.passed ? 1.0 : 0.0,
        derivation: result.passed
          ? 'Alternative explanations were tested and none was supported'
          : 'At least one alternative explanation was supported by the data'
      };
    }

    default: {
      return {
        score: result.passed ? 1.0 : 0.0,
        derivation: 'Binary result'
      };
    }
  }
}

/**
 * Aggregate test results into an overall credibility score
 */
export function computeDisconfirmationScore(
  results: TestResult[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): DisconfirmationScore {
  const breakdown: TestScore[] = [];
  const skipped: TestName[] = [];

  for (const wc of config.tests) {
    const result = results.find(r => r.test === wc.test);
    if (result) {
      breakdown.push(scoreTest(result, config));
    } else {
      skipped.push(wc.test);
    }
  }

  // Handle results for tests not in the config (custom tests)
  for (const result of results) {
    if (!config.tests.find(t => t.test === result.test)) {
      breakdown.push(scoreTest(result, config));
    }
  }

  const evaluated = breakdown.filter(b => !skipped.includes(b.test));
  const totalWeight = evaluated.reduce((sum, b) => sum + b.weight, 0);
  const weightedTotal = evaluated.reduce((sum, b) => sum + b.weightedScore, 0);

  const denominator = config.excludeNotRunFromDenominator
    ? totalWeight
    : config.tests.reduce((sum, t) => sum + t.weight, 0);

  const overall = denominator > 0 ? weightedTotal / denominator : 0;
  const coverage = config.tests.reduce((sum, t) => sum + t.weight, 0) > 0
    ? totalWeight / config.tests.reduce((sum, t) => sum + t.weight, 0)
    : 0;

  const tier = determineTier(overall, config);
  const criticalFailures = evaluated
    .filter(b => !b.passed && b.weight >= 0.20)
    .map(b => b.test);

  const recommendations = buildRecommendations(breakdown, skipped, tier.tier, criticalFailures, coverage);

  return {
    overall: Math.max(0, Math.min(1, overall)),
    tier: tier.tier,
    tierLabel: tier.label,
    tierInterpretation: tier.interpretation,
    tierAction: tier.action,
    breakdown,
    testsRun: evaluated.length,
    testsSkipped: skipped.length,
    coverage,
    recommendations,
    criticalFailures,
    reportable: overall >= 0.60 && criticalFailures.length === 0
  };
}

/**
 * Determine which credibility tier an overall score falls into
 */
export function determineTier(score: number, config: ScoringConfig = DEFAULT_SCORING_CONFIG): CredibilityTier {
  for (const tier of config.tiers) {
    if (score >= tier.minScore && score < tier.maxScore) {
      return tier;
    }
  }
  // Score of exactly 1.0 falls through if maxScore <= 1.0
  return config.tiers[config.tiers.length - 1];
}

/**
 * Build actionable recommendations from the score breakdown
 */
function buildRecommendations(
  breakdown: TestScore[],
  skipped: TestName[],
  tier: CredibilityLevel,
  criticalFailures: TestName[],
  coverage: number
): string[] {
  const recs: string[] = [];

  // Critical failure guidance
  for (const failure of criticalFailures) {
    switch (failure) {
      case TestName.PLACEBO:
        recs.push(
          'CRITICAL: The placebo test failed, indicating false positive bias in the ' +
          'analysis methodology. Do not report any findings from this pipeline until ' +
          'the methodology is corrected and the placebo test passes.'
        );
        break;
      case TestName.ALTERNATIVE_EXPLANATIONS:
        recs.push(
          'CRITICAL: Alternative explanations account for the observed effect. The ' +
          'disparity should be attributed to the identified mechanism rather than to ' +
          'bias, or the finding should be rejected.'
        );
        break;
      case TestName.NEGATIVE_CONTROLS:
        recs.push(
          'CRITICAL: Negative control results are inconsistent with the main finding, ' +
          'suggesting systemic methodological bias. Investigate data quality and model ' +
          'specification before drawing any conclusion.'
        );
        break;
      default:
        recs.push(
          `CRITICAL: The ${failure} test failed. This is a high-weight test and its failure substantially undermines the finding.`
        );
    }
  }

  // Near-miss guidance
  for (const b of breakdown) {
    if (b.passed && b.score < 0.9) {
      recs.push(
        `The ${b.test} test passed narrowly (score ${b.score.toFixed(2)}). ` +
        `${b.derivation}. Consider strengthening this test in the next analysis cycle.`
      );
    }
  }

  // Low-scoring but non-critical
  for (const b of breakdown) {
    if (!b.passed && b.weight < 0.20) {
      recs.push(
        `The ${b.test} test failed (score ${b.score.toFixed(2)}). ${b.derivation}. ` +
        'This weakens the finding but does not invalidate it; report with this ' +
        'limitation stated explicitly.'
      );
    }
  }

  // Coverage guidance
  if (coverage < 0.6) {
    recs.push(
      `Only ${(coverage * 100).toFixed(0)}% of the protocol weight was evaluated. ` +
      'The credibility assessment is correspondingly limited; state which tests were ' +
      'not run and why.'
    );
  }

  // Tier-specific closing guidance
  switch (tier) {
    case CredibilityLevel.HIGH:
      recs.push(
        'Finding is suitable for policy recommendation, public reporting, and use in ' +
        'settings where it will be adversarially challenged.'
      );
      break;
    case CredibilityLevel.QUALIFIED:
      recs.push(
        'Report with explicit qualification naming each limitation. Do not present the ' +
        'finding as settled.'
      );
      break;
    case CredibilityLevel.TENTATIVE:
      recs.push(
        'Do not base policy decisions on this finding. Report as preliminary and ' +
        'hypothesis-generating; prioritize the failing test for remediation.'
      );
      break;
    case CredibilityLevel.WEAK:
      recs.push(
        'Do not report as a finding. Use this result to guide data collection and ' +
        'methodological improvement in the next analysis cycle.'
      );
      break;
    case CredibilityLevel.NOT_CREDIBLE:
      recs.push(
        'Do not report any findings from this analysis. Correct the methodology and ' +
        're-run the full disconfirmation protocol before producing any interpretation.'
      );
      break;
  }

  if (skipped.length > 0) {
    recs.push(
      `Tests not run: ${skipped.join(', ')}. Each omission reduces the evidential ` +
      'value of the overall assessment.'
    );
  }

  return recs;
}

/**
 * Describe a score in plain language
 */
function describeScore(score: number): string {
  if (score >= 0.95) return 'Full credit - the test provided unambiguous support';
  if (score >= 0.75) return 'Strong pass - the test supported the finding with minor caveats';
  if (score >= 0.6) return 'Pass with qualifications - the test supported the finding but not unambiguously';
  if (score >= 0.4) return 'Marginal - the test raised concerns that were not fully resolved';
  if (score > 0) return 'Fail - the test did not support the finding';
  return 'Hard fail - the test actively contradicted the finding';
}

/**
 * Create a custom scoring configuration
 */
export function createScoringConfig(
  tests: TestWeightConfig[],
  tiers?: CredibilityTier[]
): ScoringConfig {
  return {
    tests,
    notRunScore: 0.5,
    excludeNotRunFromDenominator: true,
    tiers: tiers ?? DEFAULT_SCORING_CONFIG.tiers
  };
}

/**
 * Create a configuration with uniform weights across a subset of tests
 */
export function createUniformConfig(tests: TestName[]): ScoringConfig {
  const weight = tests.length > 0 ? 1 / tests.length : 0;
  return createScoringConfig(
    tests.map(t => ({
      test: t,
      weight,
      description: `Uniform weight for ${t}`,
      fullCredit: 1.0,
      zeroCredit: 0.0
    }))
  );
}

// Re-export TestName for external consumers
export { TestName };
