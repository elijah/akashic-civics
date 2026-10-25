import {
  OutcomeType,
  DataCharacteristics,
  TestName,
  selectTests,
  generateMinimalBattery,
  generateFullBattery
} from '../adaptive_disconfirmation';

describe('Adaptive Disconfirmation Test Selection', () => {
  const emptyCharacteristics: DataCharacteristics = {
    outcomeType: OutcomeType.BINARY,
    sampleSize: 1000,
    hasTimeVariable: false,
    hasGroupingVariables: []
  };

  describe('selectTests', () => {
    test('always includes placebo test', () => {
      const result = selectTests([], OutcomeType.BINARY, emptyCharacteristics);
      expect(result.selectedTests).toContain(TestName.PLACEBO);
    });

    test('always includes specification sensitivity test', () => {
      const result = selectTests([], OutcomeType.BINARY, emptyCharacteristics);
      expect(result.selectedTests).toContain(TestName.SPEC_SENSITIVITY);
    });

    test('always includes alternative explanations test', () => {
      const result = selectTests([], OutcomeType.BINARY, emptyCharacteristics);
      expect(result.selectedTests).toContain(TestName.ALTERNATIVE_EXPLANATIONS);
    });

    test('includes negative controls for binary outcome with large sample', () => {
      const result = selectTests([], OutcomeType.BINARY, { ...emptyCharacteristics, sampleSize: 1000 });
      expect(result.selectedTests).toContain(TestName.NEGATIVE_CONTROLS);
    });

    test('skips negative controls for small binary sample', () => {
      const result = selectTests([], OutcomeType.BINARY, { ...emptyCharacteristics, sampleSize: 50 });
      expect(result.skippedTests).toContain(TestName.NEGATIVE_CONTROLS);
    });

    test('skips out-of-sample for small sample', () => {
      const result = selectTests([], OutcomeType.BINARY, { ...emptyCharacteristics, sampleSize: 100 });
      expect(result.skippedTests).toContain(TestName.OUT_OF_SAMPLE);
    });

    test('includes out-of-sample for large sample', () => {
      const result = selectTests([], OutcomeType.BINARY, { ...emptyCharacteristics, sampleSize: 2000 });
      expect(result.selectedTests).toContain(TestName.OUT_OF_SAMPLE);
    });

    test('skips temporal robustness when no time variable', () => {
      const result = selectTests([], OutcomeType.BINARY, { ...emptyCharacteristics, hasTimeVariable: false });
      expect(result.skippedTests).toContain(TestName.TEMPORAL_ROBUSTNESS);
    });

    test('includes temporal robustness when time variable present', () => {
      const result = selectTests([], OutcomeType.BINARY, { ...emptyCharacteristics, hasTimeVariable: true });
      expect(result.selectedTests).toContain(TestName.TEMPORAL_ROBUSTNESS);
    });

    test('all 6 tests selected for large sample with time variable', () => {
      const result = selectTests([], OutcomeType.BINARY, {
        ...emptyCharacteristics,
        sampleSize: 2000,
        hasTimeVariable: true
      });
      expect(result.selectedTests.length).toBe(6);
      expect(result.skippedTests.length).toBe(0);
    });

    test('rationale covers all selected tests', () => {
      const result = selectTests([], OutcomeType.BINARY, emptyCharacteristics);
      for (const test of result.selectedTests) {
        expect(result.rationale[test]).toBeDefined();
        expect(result.rationale[test]?.length).toBeGreaterThan(0);
      }
    });

    test('expected coverage is between 0 and 1', () => {
      const result = selectTests([], OutcomeType.BINARY, emptyCharacteristics);
      expect(result.expectedCoverage).toBeGreaterThanOrEqual(0);
      expect(result.expectedCoverage).toBeLessThanOrEqual(1);
    });

    test('returns distinct selected and skipped tests', () => {
      const result = selectTests([], OutcomeType.BINARY, emptyCharacteristics);
      const overlap = result.selectedTests.filter(t => result.skippedTests.includes(t));
      expect(overlap).toHaveLength(0);
    });
  });

  describe('generateMinimalBattery', () => {
    test('returns only critical tests for small sample', () => {
      const result = generateMinimalBattery(OutcomeType.BINARY, 50, false);
      expect(result.selectedTests).toContain(TestName.PLACEBO);
      expect(result.selectedTests).toContain(TestName.SPEC_SENSITIVITY);
      expect(result.selectedTests).toContain(TestName.ALTERNATIVE_EXPLANATIONS);
      expect(result.selectedTests).not.toContain(TestName.OUT_OF_SAMPLE);
      expect(result.selectedTests).not.toContain(TestName.TEMPORAL_ROBUSTNESS);
    });

    test('includes negative controls for binary with adequate sample', () => {
      const result = generateMinimalBattery(OutcomeType.BINARY, 200, false);
      expect(result.selectedTests).toContain(TestName.NEGATIVE_CONTROLS);
    });

    test('skips negative controls for non-binary outcomes', () => {
      const result = generateMinimalBattery(OutcomeType.CONTINUOUS, 200, false);
      expect(result.selectedTests).not.toContain(TestName.NEGATIVE_CONTROLS);
    });

    test('has lower expected coverage than full battery', () => {
      const minimal = generateMinimalBattery(OutcomeType.BINARY, 1000, true);
      const full = generateFullBattery([], OutcomeType.BINARY, {
        ...emptyCharacteristics,
        sampleSize: 1000,
        hasTimeVariable: true
      });
      expect(minimal.expectedCoverage).toBeLessThan(full.expectedCoverage);
    });
  });

  describe('generateFullBattery', () => {
    test('includes all tests for large sample with time variable', () => {
      const result = generateFullBattery([], OutcomeType.BINARY, {
        ...emptyCharacteristics,
        sampleSize: 2000,
        hasTimeVariable: true
      });
      expect(result.selectedTests.length).toBe(6);
    });

    test('is consistent with selectTests', () => {
      const fromFull = generateFullBattery([], OutcomeType.CONTINUOUS, {
        ...emptyCharacteristics,
        outcomeType: OutcomeType.CONTINUOUS,
        sampleSize: 500,
        hasTimeVariable: false
      });
      const fromSelect = selectTests([], OutcomeType.CONTINUOUS, {
        ...emptyCharacteristics,
        outcomeType: OutcomeType.CONTINUOUS,
        sampleSize: 500,
        hasTimeVariable: false
      });
      expect(fromFull.selectedTests).toEqual(fromSelect.selectedTests);
    });
  });

  describe('TestName enum', () => {
    test('has expected values', () => {
      expect(TestName.PLACEBO).toBe('placebo');
      expect(TestName.SPEC_SENSITIVITY).toBe('spec_sensitivity');
      expect(TestName.NEGATIVE_CONTROLS).toBe('negative_controls');
      expect(TestName.OUT_OF_SAMPLE).toBe('out_of_sample');
      expect(TestName.TEMPORAL_ROBUSTNESS).toBe('temporal_robustness');
      expect(TestName.ALTERNATIVE_EXPLANATIONS).toBe('alternative_explanations');
    });
  });
});
