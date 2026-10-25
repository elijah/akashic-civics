import {
  ValidationSeverity,
  ValidationCategory,
  extractClaims,
  validateResponse,
  scoreConfidence,
  deriveRefinementSuggestions,
  applyRefinements,
  runFeedbackLoop,
  refineFromData
} from '../feedback_loop';
import {
  ExpertiseLevel,
  QuestionType,
  OutcomeType,
  DataCharacteristics,
  PromptContext
} from '../context_aware_prompts';
import { RAnalysisResult } from '../../r-interface/r_bridge';
import { CaseStatistics } from '../../statistical/statistical_analysis';

function makeResult(overrides: Partial<RAnalysisResult> = {}): RAnalysisResult {
  return {
    analysis_type: 'logistic_regression',
    effect_size: 0.42,
    p_value: 0.023,
    confidence_interval: [0.15, 0.68],
    odds_ratio: 1.52,
    sample_size: 1200,
    ...overrides
  };
}

function makeCharacteristics(overrides: Partial<DataCharacteristics> = {}): DataCharacteristics {
  return {
    sampleSize: 1200,
    outcomeType: OutcomeType.BINARY,
    missingRate: 0.05,
    hasTimeVariable: true,
    hasGroupingVariables: true,
    hasMissingValues: false,
    hasSmallGroups: false,
    ...overrides
  };
}

function makeContext(overrides: Partial<PromptContext> = {}): PromptContext {
  return {
    jurisdiction: 'Texas',
    timePeriod: '2020-2024',
    question: 'Is there a racial disparity in sentencing?',
    questionType: QuestionType.DISPARITY,
    expertiseLevel: ExpertiseLevel.INTERMEDIATE,
    data: makeCharacteristics(),
    ...overrides
  };
}

function makeCase(overrides: Partial<CaseStatistics> = {}): CaseStatistics {
  return {
    case_id: 'c1',
    conviction: 1,
    sentence_months: 12,
    days_to_disposition: 30,
    race_ethnicity: 'A',
    offense_severity: 'felony',
    missing_fields: null,
    ...overrides
  };
}

describe('Feedback Loop', () => {
  describe('extractClaims', () => {
    test('extracts a p-value claim', () => {
      const claims = extractClaims('The p-value was 0.023.');
      const pClaim = claims.find(c => c.kind === 'p_value');
      expect(pClaim?.value).toBe(0.023);
    });

    test('extracts a confidence interval claim', () => {
      const claims = extractClaims('The 95% CI was [0.15, 0.68].');
      const ciClaim = claims.find(c => c.kind === 'confidence_interval');
      expect(ciClaim?.lowerBound).toBe(0.15);
      expect(ciClaim?.upperBound).toBe(0.68);
    });

    test('extracts an effect size claim', () => {
      const claims = extractClaims('The effect size = 0.42.');
      const effectClaim = claims.find(c => c.kind === 'effect_size');
      expect(effectClaim?.value).toBe(0.42);
    });

    test('extracts causal language', () => {
      const claims = extractClaims('Bias causes this outcome.');
      expect(claims.some(c => c.kind === 'causal')).toBe(true);
    });

    test('extracts significance assertions', () => {
      const claims = extractClaims('The result was statistically significant.');
      expect(claims.some(c => c.kind === 'significance')).toBe(true);
    });

    test('returns empty array for text with no claims', () => {
      expect(extractClaims('The data were collected over five years.')).toEqual([]);
    });

    test('orders confidence interval bounds', () => {
      const claims = extractClaims('CI: 0.68 to 0.15');
      const ciClaim = claims.find(c => c.kind === 'confidence_interval');
      expect(ciClaim?.lowerBound).toBe(0.15);
      expect(ciClaim?.upperBound).toBe(0.68);
    });
  });

  describe('validateResponse', () => {
    test('passes a response that matches the analysis', () => {
      const response = 'The p-value was 0.023 and the 95% CI was [0.15, 0.68]. ' +
        'The effect size = 0.42. The result was statistically significant. ' +
        'One limitation is that unmeasured confounders may explain some of the effect.';
      const report = validateResponse(response, makeResult());
      expect(report.issues.filter(i => i.severity === ValidationSeverity.ERROR)).toHaveLength(0);
      expect(report.claimSupportRate).toBeGreaterThan(0.8);
    });

    test('flags a fabricated p-value', () => {
      const response = 'The p-value was 0.001. Limitations: confounding is possible.';
      const report = validateResponse(response, makeResult());
      const fabrication = report.issues.find(i => i.category === ValidationCategory.FABRICATION);
      expect(fabrication).toBeDefined();
      expect(fabrication?.severity).toBe(ValidationSeverity.ERROR);
    });

    test('flags a fabricated confidence interval', () => {
      const response = 'The 95% CI was [0.80, 0.95]. Limitations: confounding.';
      const report = validateResponse(response, makeResult());
      expect(report.issues.some(i => i.category === ValidationCategory.FABRICATION)).toBe(true);
    });

    test('flags a fabricated effect size', () => {
      const response = 'The effect size = 5.00. Limitations: confounding.';
      const report = validateResponse(response, makeResult());
      expect(report.issues.some(i => i.category === ValidationCategory.FABRICATION)).toBe(true);
    });

    test('flags causal overclaim', () => {
      const response = 'Racial bias causes the disparity. p = 0.023. Limitations: none.';
      const report = validateResponse(response, makeResult());
      const overclaim = report.issues.find(i => i.category === ValidationCategory.OVERCLAIM);
      expect(overclaim).toBeDefined();
    });

    test('flags missing limitations', () => {
      const response = 'The p-value was 0.023. The effect size = 0.42. The result was statistically significant.';
      const report = validateResponse(response, makeResult());
      expect(report.issues.some(i => i.category === ValidationCategory.MISSING_LIMITATION)).toBe(true);
    });

    test('flags deterministic language', () => {
      const response = 'This proves the disparity exists. p = 0.023. A limitation is confounding.';
      const report = validateResponse(response, makeResult());
      expect(report.issues.some(i => i.message.includes('Deterministic language'))).toBe(true);
    });

    test('flags a significance contradiction', () => {
      const response = 'The result was not statistically significant. p = 0.023. A limitation is confounding.';
      const report = validateResponse(response, makeResult());
      expect(report.issues.some(i => i.category === ValidationCategory.OVERCLAIM)).toBe(true);
    });

    test('reports a valid response as valid', () => {
      const response = 'The p-value was 0.023 and the 95% CI was [0.15, 0.68]. ' +
        'The effect size = 0.42. The result was statistically significant. ' +
        'A key limitation is that this observational analysis cannot establish causation.';
      const report = validateResponse(response, makeResult());
      expect(report.valid).toBe(true);
      expect(report.score).toBeGreaterThan(0.8);
    });
  });

  describe('scoreConfidence', () => {
    test('scores a strong result higher than a weak one', () => {
      const strong = scoreConfidence(
        makeResult({ p_value: 0.001, confidence_interval: [0.3, 0.5] }),
        'p = 0.001. CI [0.3, 0.5]. The result was statistically significant. A limitation is confounding.'
      );
      const weak = scoreConfidence(
        makeResult({ p_value: 0.4, confidence_interval: [-0.2, 0.6] }),
        'p = 0.4. The result was not statistically significant. A limitation is confounding.'
      );
      expect(strong.confidence).toBeGreaterThan(weak.confidence);
    });

    test('decomposes confidence into components', () => {
      const score = scoreConfidence(makeResult(), 'p = 0.023. A limitation is confounding.');
      expect(score.components.statisticalStrength).toBeGreaterThan(0);
      expect(score.components.sampleAdequacy).toBeGreaterThan(0);
      expect(score.components.dataQuality).toBeGreaterThan(0);
      expect(score.components.disconfirmationStatus).toBeGreaterThan(0);
      expect(score.components.claimCalibration).toBeGreaterThan(0);
    });

    test('penalizes a high missing rate', () => {
      const good = scoreConfidence(makeResult(), 'p = 0.023. A limitation is confounding.', makeCharacteristics());
      const bad = scoreConfidence(makeResult(), 'p = 0.023. A limitation is confounding.', makeCharacteristics({ missingRate: 0.35 }));
      expect(bad.components.dataQuality).toBeLessThan(good.components.dataQuality);
    });

    test('uses disconfirmation status when available', () => {
      const passing = scoreConfidence(
        makeResult({ disconfirmation_tests: { passed: true, tests_passed: 6, tests_total: 6, details: {} } }),
        'p = 0.023. A limitation is confounding.'
      );
      const failing = scoreConfidence(
        makeResult({ disconfirmation_tests: { passed: false, tests_passed: 2, tests_total: 6, details: {} } }),
        'p = 0.023. A limitation is confounding.'
      );
      expect(passing.components.disconfirmationStatus).toBeGreaterThan(failing.components.disconfirmationStatus);
    });

    test('returns a level consistent with the score', () => {
      const score = scoreConfidence(
        makeResult({ p_value: 0.001, confidence_interval: [0.35, 0.49] }),
        'p = 0.001. CI [0.35, 0.49]. The result was statistically significant. A limitation is confounding.',
        makeCharacteristics({ sampleSize: 5000 })
      );
      expect(['low', 'moderate', 'high']).toContain(score.level);
      expect(score.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('deriveRefinementSuggestions', () => {
    test('suggests a requirement for fabricated numbers', () => {
      const validation = validateResponse('The p-value was 0.9.', makeResult());
      const suggestions = deriveRefinementSuggestions(validation, makeContext());
      expect(suggestions.some(s => s.type === 'add_requirement')).toBe(true);
    });

    test('suggests a data warning for small samples', () => {
      const validation = validateResponse('p = 0.023. A limitation is confounding.', makeResult());
      const suggestions = deriveRefinementSuggestions(validation, makeContext({ data: makeCharacteristics({ sampleSize: 40 }) }));
      expect(suggestions.some(s => s.type === 'add_data_warning')).toBe(true);
    });

    test('suggests added context for high missingness', () => {
      const validation = validateResponse('p = 0.023. A limitation is confounding.', makeResult());
      const suggestions = deriveRefinementSuggestions(validation, makeContext({ data: makeCharacteristics({ missingRate: 0.25 }) }));
      expect(suggestions.some(s => s.type === 'add_context')).toBe(true);
    });

    test('does not duplicate suggestions', () => {
      const validation = validateResponse('The p-value was 0.9. The effect size = 9.0.', makeResult());
      const suggestions = deriveRefinementSuggestions(validation, makeContext());
      const keys = suggestions.map(s => s.type + s.instruction);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  describe('applyRefinements', () => {
    test('adds requirement instructions to prior analyses', () => {
      const context = makeContext();
      const refined = applyRefinements(context, [{
        type: 'add_requirement',
        instruction: 'Use only provided values.',
        rationale: 'test'
      }]);
      expect(refined.priorAnalyses).toContain('Use only provided values.');
    });

    test('preserves the original context fields', () => {
      const context = makeContext();
      const refined = applyRefinements(context, []);
      expect(refined.jurisdiction).toBe(context.jurisdiction);
      expect(refined.question).toBe(context.question);
      expect(refined.expertiseLevel).toBe(context.expertiseLevel);
    });
  });

  describe('runFeedbackLoop', () => {
    test('converges immediately on a valid response', () => {
      const response = 'The p-value was 0.023 and the 95% CI was [0.15, 0.68]. ' +
        'The effect size = 0.42. The result was statistically significant. ' +
        'A key limitation is that this observational analysis cannot establish causation.';
      const result = runFeedbackLoop(makeContext(), makeResult(), [response]);
      expect(result.converged).toBe(true);
      expect(result.totalRounds).toBe(0);
      expect(result.finalConfidence).toBeGreaterThan(0);
    });

    test('refines an invalid response', () => {
      const bad = 'The p-value was 0.9. The effect size = 5.0.';
      const good = 'The p-value was 0.023 and the 95% CI was [0.15, 0.68]. ' +
        'The effect size = 0.42. The result was statistically significant. ' +
        'A key limitation is that this observational analysis cannot establish causation.';
      const result = runFeedbackLoop(makeContext(), makeResult(), [bad, good]);
      expect(result.totalRounds).toBeGreaterThan(0);
      expect(result.rounds.length).toBe(result.totalRounds);
      expect(result.converged).toBe(true);
    });

    test('records before and after validation for each round', () => {
      const bad = 'The p-value was 0.9. The effect size = 5.0.';
      const good = 'The p-value was 0.023 and the 95% CI was [0.15, 0.68]. ' +
        'The effect size = 0.42. The result was statistically significant. ' +
        'A key limitation is that this observational analysis cannot establish causation.';
      const result = runFeedbackLoop(makeContext(), makeResult(), [bad, good]);
      const round = result.rounds[0];
      expect(round.round).toBe(1);
      expect(round.appliedSuggestions.length).toBeGreaterThan(0);
      expect(round.validationBefore).toBeDefined();
      expect(round.validationAfter).toBeDefined();
    });

    test('stops at the maximum round count', () => {
      const bad = 'The p-value was 0.9. The effect size = 5.0.';
      const result = runFeedbackLoop(makeContext(), makeResult(), [bad], 2);
      expect(result.totalRounds).toBeLessThanOrEqual(2);
    });

    test('returns a final prompt that can be generated', () => {
      const result = runFeedbackLoop(makeContext(), makeResult(), ['The p-value was 0.9.']);
      expect(result.finalPrompt.prompt.length).toBeGreaterThan(0);
      expect(result.finalPrompt.systemPrompt.length).toBeGreaterThan(0);
    });
  });

  describe('refineFromData', () => {
    test('builds a context from raw data and runs the loop', () => {
      const cases = Array.from({ length: 50 }, (_, i) => makeCase({ case_id: `c${i}` }));
      const result = refineFromData('Is there bias?', cases, makeResult(), [
        'The p-value was 0.023 and the 95% CI was [0.15, 0.68]. ' +
        'The effect size = 0.42. The result was statistically significant. ' +
        'A key limitation is that this observational analysis cannot establish causation.'
      ]);
      expect(result.finalPrompt.prompt).toContain('Is there bias?');
      expect(result.converged).toBe(true);
    });
  });
});
