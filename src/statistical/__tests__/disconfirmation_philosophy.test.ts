import {
  FALSIFICATION_PRINCIPLE,
  EPISTEMOLOGICAL_DISTINCTION,
  TEST_PHILOSOPHY,
  COMMON_MISCONCEPTIONS,
  LEGAL_CONTEXT,
  getTestPhilosophy,
  getAllTestPhilosophies,
  getCoreRationale
} from '../disconfirmation_philosophy';

describe('Disconfirmation Philosophy', () => {
  describe('FALSIFICATION_PRINCIPLE', () => {
    test('has required fields', () => {
      expect(FALSIFICATION_PRINCIPLE).toBeDefined();
      expect(FALSIFICATION_PRINCIPLE.name).toBeDefined();
      expect(FALSIFICATION_PRINCIPLE.source).toBeDefined();
      expect(FALSIFICATION_PRINCIPLE.statement).toBeDefined();
      expect(FALSIFICATION_PRINCIPLE.implication).toBeDefined();
    });
  });

  describe('EPISTEMOLOGICAL_DISTINCTION', () => {
    test('has required fields', () => {
      expect(EPISTEMOLOGICAL_DISTINCTION).toBeDefined();
      expect(EPISTEMOLOGICAL_DISTINCTION.confirmatory.label).toBeDefined();
      expect(EPISTEMOLOGICAL_DISTINCTION.confirmatory.question).toBeDefined();
      expect(EPISTEMOLOGICAL_DISTINCTION.disconfirmatory.label).toBeDefined();
      expect(EPISTEMOLOGICAL_DISTINCTION.disconfirmatory.question).toBeDefined();
    });
  });

  describe('TEST_PHILOSOPHY', () => {
    test('has entries for all 6 tests', () => {
      const tests = Object.keys(TEST_PHILOSOPHY);
      expect(tests.length).toBeGreaterThanOrEqual(6);
      expect(TEST_PHILOSOPHY.placebo).toBeDefined();
      expect(TEST_PHILOSOPHY.spec_sensitivity).toBeDefined();
      expect(TEST_PHILOSOPHY.negative_controls).toBeDefined();
      expect(TEST_PHILOSOPHY.out_of_sample).toBeDefined();
      expect(TEST_PHILOSOPHY.temporal_robustness).toBeDefined();
      expect(TEST_PHILOSOPHY.alternative_explanations).toBeDefined();
    });

    test('each entry has required fields', () => {
      for (const [name, philosophy] of Object.entries(TEST_PHILOSOPHY)) {
        expect(philosophy.testId).toBe(name);
        expect(philosophy.name).toBeDefined();
        expect(philosophy.title).toBeDefined();
        expect(philosophy.coreQuestion).toBeDefined();
        expect(Array.isArray(philosophy.whatItGuardsAgainst)).toBe(true);
        expect(philosophy.rationale).toBeDefined();
        expect(philosophy.whyItMatters).toBeDefined();
        expect(philosophy.failureMeaning).toBeDefined();
        expect(philosophy.passMeaning).toBeDefined();
        expect(philosophy.evidentiaryValue).toBeDefined();
      }
    });
  });

  describe('getTestPhilosophy', () => {
    test('returns philosophy for valid test', () => {
      const philosophy = getTestPhilosophy('placebo');
      expect(philosophy).toBeDefined();
      expect(philosophy?.name).toBe('Placebo Tests');
    });

    test('returns undefined for unknown test', () => {
      const philosophy = getTestPhilosophy('nonexistent_test');
      expect(philosophy).toBeUndefined();
    });
  });

  describe('getAllTestPhilosophies', () => {
    test('returns array of philosophies', () => {
      const philosophies = getAllTestPhilosophies();
      expect(philosophies.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('getCoreRationale', () => {
    test('returns a non-empty string', () => {
      const rationale = getCoreRationale();
      expect(rationale.length).toBeGreaterThan(0);
    });
  });

  describe('COMMON_MISCONCEPTIONS', () => {
    test('is an array', () => {
      expect(Array.isArray(COMMON_MISCONCEPTIONS)).toBe(true);
      expect(COMMON_MISCONCEPTIONS.length).toBeGreaterThan(0);
    });

    test('each misconception has required fields', () => {
      for (const misconception of COMMON_MISCONCEPTIONS) {
        expect(misconception.myth).toBeDefined();
        expect(misconception.correction).toBeDefined();
      }
    });
  });

  describe('LEGAL_CONTEXT', () => {
    test('has required fields', () => {
      expect(LEGAL_CONTEXT).toBeDefined();
      expect(LEGAL_CONTEXT.analogy).toBeDefined();
      expect(LEGAL_CONTEXT.burdenOfProof).toBeDefined();
      expect(LEGAL_CONTEXT.defaultStance).toBeDefined();
      expect(LEGAL_CONTEXT.transparencyImplication).toBeDefined();
    });
  });
});