import {
  ExpertiseLevel,
  QuestionType,
  OutcomeType,
  detectExpertiseLevel,
  detectQuestionType,
  analyzeDataCharacteristics,
  generateContextAwarePrompt,
  optimizePromptForData,
  generateBatchPrompts,
  summarizePromptCharacteristics,
  DataCharacteristics,
  PromptContext
} from '../context_aware_prompts';
import { CaseStatistics } from '../../statistical/statistical_analysis';

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

function makeCharacteristics(overrides: Partial<DataCharacteristics> = {}): DataCharacteristics {
  return {
    sampleSize: 1000,
    outcomeType: OutcomeType.BINARY,
    missingRate: 0.05,
    hasTimeVariable: true,
    hasGroupingVariables: true,
    hasMissingValues: false,
    hasSmallGroups: false,
    ...overrides
  };
}

describe('Context-Aware Prompts', () => {
  describe('detectExpertiseLevel', () => {
    test('detects novice for plain language questions', () => {
      expect(detectExpertiseLevel('Is there a difference in outcomes between groups?')).toBe(ExpertiseLevel.NOVICE);
    });

    test('detects expert for dense statistical terminology', () => {
      const q = 'Compute the effect size and hazard ratio from the Cox model, then run a sensitivity analysis and placebo test';
      expect(detectExpertiseLevel(q)).toBe(ExpertiseLevel.EXPERT);
    });

    test('detects intermediate for moderate statistical language', () => {
      expect(detectExpertiseLevel('Adjust the regression for confounders and control for the sample size bias')).toBe(ExpertiseLevel.INTERMEDIATE);
    });

    test('promotes to expert when prior analyses exist', () => {
      expect(detectExpertiseLevel('What is the odds ratio?', true)).toBe(ExpertiseLevel.EXPERT);
    });

    test('promotes to intermediate when prior analyses exist', () => {
      expect(detectExpertiseLevel('Are the groups different?', true)).toBe(ExpertiseLevel.INTERMEDIATE);
    });
  });

  describe('detectQuestionType', () => {
    test('detects causal questions', () => {
      expect(detectQuestionType('What caused this disparity?')).toBe(QuestionType.CAUSAL);
    });

    test('detects prediction questions', () => {
      expect(detectQuestionType('Can we predict the next conviction rate?')).toBe(QuestionType.PREDICTION);
    });

    test('detects diagnostic questions', () => {
      expect(detectQuestionType('Why is the rate increasing?')).toBe(QuestionType.DIAGNOSTIC);
    });

    test('detects disparity questions', () => {
      expect(detectQuestionType('Is there a racial bias in sentencing?')).toBe(QuestionType.DISPARITY);
    });

    test('detects correlation questions', () => {
      expect(detectQuestionType('Is offense severity associated with sentence length?')).toBe(QuestionType.CORRELATION);
    });

    test('defaults to disparity for unrecognized questions', () => {
      expect(detectQuestionType('Tell me about the data')).toBe(QuestionType.DISPARITY);
    });
  });

  describe('analyzeDataCharacteristics', () => {
    test('computes sample size and missing rate', () => {
      const cases = [
        makeCase(),
        makeCase({ case_id: 'c2', missing_fields: ['x'] }),
        makeCase({ case_id: 'c3' })
      ];
      const result = analyzeDataCharacteristics(cases, OutcomeType.BINARY, true);
      expect(result.sampleSize).toBe(3);
      expect(result.missingRate).toBeCloseTo(1 / 3, 5);
      expect(result.hasMissingValues).toBe(true);
      expect(result.hasTimeVariable).toBe(true);
    });

    test('detects small groups', () => {
      const cases = [
        makeCase({ race_ethnicity: 'A' }),
        makeCase({ case_id: 'c2', race_ethnicity: 'B' }),
        makeCase({ case_id: 'c3', race_ethnicity: 'B' })
      ];
      const result = analyzeDataCharacteristics(cases);
      expect(result.hasSmallGroups).toBe(true);
    });

    test('detects no small groups with large groups', () => {
      const cases = Array.from({ length: 60 }, (_, i) => makeCase({ case_id: `c${i}`, race_ethnicity: 'A' }));
      const result = analyzeDataCharacteristics(cases);
      expect(result.hasSmallGroups).toBe(false);
    });

    test('handles empty dataset', () => {
      const result = analyzeDataCharacteristics([]);
      expect(result.sampleSize).toBe(0);
      expect(result.missingRate).toBe(0);
    });
  });

  describe('generateContextAwarePrompt', () => {
    const baseContext: PromptContext = {
      jurisdiction: 'Texas',
      timePeriod: '2020-2024',
      question: 'Is there a racial disparity?',
      questionType: QuestionType.DISPARITY,
      expertiseLevel: ExpertiseLevel.INTERMEDIATE,
      data: makeCharacteristics()
    };

    test('generates a prompt with context', () => {
      const result = generateContextAwarePrompt(baseContext.question, baseContext);
      expect(result.prompt).toContain('Texas');
      expect(result.prompt).toContain('2020-2024');
      expect(result.prompt).toContain('Is there a racial disparity?');
    });

    test('generates a system prompt matching expertise level', () => {
      const novice = generateContextAwarePrompt(baseContext.question, { ...baseContext, expertiseLevel: ExpertiseLevel.NOVICE });
      const expert = generateContextAwarePrompt(baseContext.question, { ...baseContext, expertiseLevel: ExpertiseLevel.EXPERT });
      expect(novice.systemPrompt).not.toBe(expert.systemPrompt);
      expect(novice.systemPrompt).toContain('plain language');
      expect(expert.systemPrompt).toContain('peer-reviewed');
    });

    test('requires disconfirmation for causal questions', () => {
      const result = generateContextAwarePrompt('What caused this?', { ...baseContext, questionType: QuestionType.CAUSAL });
      expect(result.disconfirmationRequired).toBe(true);
      expect(result.prompt).toContain('Disconfirmation');
    });

    test('does not require disconfirmation for small correlation samples', () => {
      const result = generateContextAwarePrompt('Any relationship?', {
        ...baseContext,
        questionType: QuestionType.CORRELATION,
        data: makeCharacteristics({ sampleSize: 50 })
      });
      expect(result.disconfirmationRequired).toBe(false);
    });

    test('honors forceDisconfirmation', () => {
      const result = generateContextAwarePrompt('Any relationship?', {
        ...baseContext,
        questionType: QuestionType.CORRELATION,
        data: makeCharacteristics({ sampleSize: 50 }),
        forceDisconfirmation: true
      });
      expect(result.disconfirmationRequired).toBe(true);
    });

    test('includes methodology requirements', () => {
      const result = generateContextAwarePrompt(baseContext.question, baseContext);
      expect(result.methodologyRequirements.length).toBeGreaterThan(0);
      for (const req of result.methodologyRequirements) {
        expect(result.prompt).toContain(req);
      }
    });

    test('estimates tokens as a positive number', () => {
      const result = generateContextAwarePrompt(baseContext.question, baseContext);
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    test('echoes back the question type and expertise level', () => {
      const result = generateContextAwarePrompt(baseContext.question, baseContext);
      expect(result.questionType).toBe(QuestionType.DISPARITY);
      expect(result.expertiseLevel).toBe(ExpertiseLevel.INTERMEDIATE);
    });
  });

  describe('optimizePromptForData', () => {
    test('adds small sample warning', () => {
      const optimized = optimizePromptForData('Base prompt', makeCharacteristics({ sampleSize: 50 }));
      expect(optimized).toContain('Small sample');
      expect(optimized).toContain('Base prompt');
    });

    test('adds missing data warning', () => {
      const optimized = optimizePromptForData('Base prompt', makeCharacteristics({ missingRate: 0.25 }));
      expect(optimized).toContain('Missing data');
    });

    test('adds small group warning', () => {
      const optimized = optimizePromptForData('Base prompt', makeCharacteristics({ hasSmallGroups: true }));
      expect(optimized).toContain('groups < 30');
    });

    test('leaves prompt unchanged when no warnings apply', () => {
      const optimized = optimizePromptForData('Base prompt', makeCharacteristics());
      expect(optimized).toBe('Base prompt');
    });
  });

  describe('generateBatchPrompts', () => {
    test('generates one prompt per question', () => {
      const baseContext = {
        jurisdiction: 'Texas',
        timePeriod: '2020',
        questionType: QuestionType.DISPARITY,
        expertiseLevel: ExpertiseLevel.INTERMEDIATE,
        data: makeCharacteristics()
      };
      const prompts = generateBatchPrompts(['Is there bias?', 'What caused it?'], baseContext);
      expect(prompts.length).toBe(2);
      expect(prompts[1].questionType).toBe(QuestionType.CAUSAL);
    });
  });

  describe('summarizePromptCharacteristics', () => {
    test('summarizes token usage and distribution', () => {
      const baseContext = {
        jurisdiction: 'Texas',
        timePeriod: '2020',
        question: 'Is there bias?',
        questionType: QuestionType.DISPARITY,
        expertiseLevel: ExpertiseLevel.NOVICE,
        data: makeCharacteristics()
      };
      const prompts = generateBatchPrompts(['Is there bias?', 'What caused it?'], baseContext);
      const summary = summarizePromptCharacteristics(prompts);
      expect(summary.totalTokens).toBeGreaterThan(0);
      expect(summary.byExpertise[ExpertiseLevel.NOVICE]).toBe(2);
      expect(summary.byQuestionType[QuestionType.CAUSAL]).toBe(1);
      expect(summary.disconfirmationRequired).toBe(2);
    });
  });
});
