/**
 * Adaptive Disconfirmation Test Selection
 * 
 * Selects which disconfirmation tests to run based on analysis characteristics,
 * outcome type, sample size, and data properties. Avoids running unnecessary
 * tests (saving compute) while ensuring all relevant threats are addressed.
 */

import { CaseStatistics } from './statistical_analysis';

/**
 * Outcome type classification based on data characteristics
 */
export enum OutcomeType {
  BINARY = 'binary',
  CONTINUOUS = 'continuous', 
  COUNT = 'count',
  TIME_TO_EVENT = 'time_to_event',
  MIXED = 'mixed'
}

/**
 * Data characteristic flags that influence test selection
 */
export interface DataCharacteristics {
  outcomeType: OutcomeType;
  sampleSize: number;
  hasTimeVariable?: boolean;
  hasCensoring?: boolean;
  hasGroupingVariables: string[];
  missingDataRate?: number;
}

/**
 * Test selection result: which tests to run and why
 */
export interface TestSelectionResult {
  selectedTests: TestName[];
  skippedTests: TestName[];
  rationale: Record<TestName, string>;
  expectedCoverage: number; // 0-1, proportion of threats addressed
}

/**
 * Test names matching the disconfirmation protocol
 */
export enum TestName {
  PLACEBO = 'placebo',
  SPEC_SENSITIVITY = 'spec_sensitivity',
  NEGATIVE_CONTROLS = 'negative_controls',
  OUT_OF_SAMPLE = 'out_of_sample',
  TEMPORAL_ROBUSTNESS = 'temporal_robustness',
  ALTERNATIVE_EXPLANATIONS = 'alternative_explanations'
}

/**
 * Test severity level: how critical this test is for the given analysis type
 */
export enum TestSeverity {
  CRITICAL = 'critical',    // Always run; foundational threat
  HIGH = 'high',           // Strongly recommended
  MODERATE = 'moderate',   // Conditional on data availability
  LOW = 'low'              // Nice to have, optional
}

/**
 * Select which disconfirmation tests to run based on analysis characteristics
 * 
 * The selection logic follows these principles:
 * 1. Always address the most critical threats first
 * 2. Conditionally run tests based on data availability
 * 3. Never skip CRITICAL tests
 * 4. Adapt to outcome type and sample size
 * 
 * @param data The case statistics dataset
 * @param outcomeType The type of outcome variable
 * @param characteristics Additional data characteristics
 * @returns Which tests to run and the rationale
 */
export function selectTests(
  data: CaseStatistics[],
  outcomeType: OutcomeType,
  characteristics: DataCharacteristics
): TestSelectionResult {
  const selected: TestName[] = [];
  const skipped: TestName[] = [];
  const rationale: Record<TestName, string> = {
    [TestName.PLACEBO]: '',
    [TestName.SPEC_SENSITIVITY]: '',
    [TestName.NEGATIVE_CONTROLS]: '',
    [TestName.OUT_OF_SAMPLE]: '',
    [TestName.TEMPORAL_ROBUSTNESS]: '',
    [TestName.ALTERNATIVE_EXPLANATIONS]: ''
  };
  
  // Prefer the actual case count when data is loaded; fall back to the
  // declared sample size when selecting a protocol before data is available.
  const n = data.length > 0 ? data.length : characteristics.sampleSize;
  const hasTime = characteristics.hasTimeVariable ?? false;
  
  // ---- TEST 1: PLACEBO ----
  // Always critical: guards against false positive bias, the #1 threat
  selected.push(TestName.PLACEBO);
  rationale[TestName.PLACEBO] = `Outcome type: ${outcomeType}; always run to detect false positive bias in methodology`;
  
  // ---- TEST 2: SPECIFICATION SENSITIVITY ----
  // Always critical: guards against analytical cherry-picking
  selected.push(TestName.SPEC_SENSITIVITY);
  rationale[TestName.SPEC_SENSITIVITY] = `Outcome type: ${outcomeType}; always run to guard against cherry-picking model specifications`;
  
  // ---- TEST 3: NEGATIVE CONTROLS ----
  // Critical if we can identify reasonable negative controls
  // For binary outcomes with sufficient sample size, this is HIGH
  // For small samples or continuous outcomes, it's MODERATE
  if (outcomeType === OutcomeType.BINARY && n >= 500) {
    selected.push(TestName.NEGATIVE_CONTROLS);
    rationale[TestName.NEGATIVE_CONTROLS] = `Binary outcome with n=${n}; negative controls are critical for distinguishing systemic bias from artifacts`;
  } else if (outcomeType === OutcomeType.BINARY && n >= 100) {
    selected.push(TestName.NEGATIVE_CONTROLS);
    rationale[TestName.NEGATIVE_CONTROLS] = `Binary outcome with n=${n}, missing some negative controls due to sample size; include if negative control variables available`;
  } else if (outcomeType === OutcomeType.CONTINUOUS && n >= 200) {
    selected.push(TestName.NEGATIVE_CONTROLS);
    rationale[TestName.NEGATIVE_CONTROLS] = `Continuous outcome with n=${n}; negative controls recommended if suitable variables available`;
  } else {
    skipped.push(TestName.NEGATIVE_CONTROLS);
    rationale[TestName.NEGATIVE_CONTROLS] = `Skipped: insufficient sample size (n=${n}) or outcome type (${outcomeType}) for reliable negative control analysis`;
  }
  
  // ---- TEST 4: OUT-OF-SAMPLE VALIDATION ----
  // Conditional on sample size
  // Small samples have low power for split-half validation
  if (n >= 1000) {
    selected.push(TestName.OUT_OF_SAMPLE);
    rationale[TestName.OUT_OF_SAMPLE] = `Large sample (n=${n}); out-of-sample validation feasible and recommended`;
  } else if (n >= 500) {
    selected.push(TestName.OUT_OF_SAMPLE);
    rationale[TestName.OUT_OF_SAMPLE] = `Moderate sample (n=${n}); out-of-sample validation included with reduced test set (70/30 split)`;
  } else {
    skipped.push(TestName.OUT_OF_SAMPLE);
    rationale[TestName.OUT_OF_SAMPLE] = `Small sample (n=${n}); out-of-sample validation skipped due to low power; instead emphasize temporal robustness`;
  }
  
  // ---- TEST 5: TEMPORAL ROBUSTNESS ----
  // Always run if time variable present; conditional if not
  if (hasTime) {
    selected.push(TestName.TEMPORAL_ROBUSTNESS);
    rationale[TestName.TEMPORAL_ROBUSTNESS] = `Time variable present; temporal robustness test critical for ruling out period-specific artifacts`;
  } else {
    skipped.push(TestName.TEMPORAL_ROBUSTNESS);
    rationale[TestName.TEMPORAL_ROBUSTNESS] = `No time variable in dataset; temporal robustness test not applicable`;
  }
  
  // ---- TEST 6: ALTERNATIVE EXPLANATIONS ----
  // Always run; this is THE core test. Severity varies by outcome type.
  selected.push(TestName.ALTERNATIVE_EXPLANATIONS);
  let altRationale = '';
  
  switch (outcomeType) {
    case OutcomeType.BINARY:
      altRationale = `Binary outcome: testing case complexity, pre-court screening, plea bargaining, geographic variation, and temporal trends as alternative explanations for disparity`;
      break;
    case OutcomeType.CONTINUOUS:
      altRationale = `Continuous outcome: testing measurement artifacts, selection effects, seasonal patterns, and covariates as alternative explanations`;
      break;
    case OutcomeType.COUNT:
      altRationale = `Count outcome: testing overdispersion, zero-inflation, exposure differences, and temporal patterns as alternative explanations`;
      break;
    case OutcomeType.TIME_TO_EVENT:
      altRationale = `Time-to-event outcome: testing proportional hazards assumption, competing risks, and selection effects as alternative explanations`;
      break;
    default:
      altRationale = `Mixed/other outcome: standard alternative explanation testing applied`;
  }
  rationale[TestName.ALTERNATIVE_EXPLANATIONS] = altRationale;
  
  // Compute expected coverage: proportion of threats addressed
  // The 6 tests address 6 major threat categories
  const totalThreats = 6;
  const selectedCount = selected.length;
  const criticalAlways = 2; // Placebo + Spec Sensitivity are always run
  const expectedCoverage = (criticalAlways + selectedCount) / totalThreats;
  
  return {
    selectedTests: selected,
    skippedTests: skipped,
    rationale,
    expectedCoverage: Math.min(expectedCoverage, 1.0)
  };
}

/**
 * Get the severity level for a test given analysis characteristics
 */
export function getTestSeverity(
  test: TestName,
  outcomeType: OutcomeType,
  sampleSize: number,
  hasTimeVariable?: boolean
): TestSeverity {
  switch (test) {
    case TestName.PLACEBO:
      return TestSeverity.CRITICAL;
    case TestName.SPEC_SENSITIVITY:
      return TestSeverity.CRITICAL;
    case TestName.ALTERNATIVE_EXPLANATIONS:
      return TestSeverity.CRITICAL;
    case TestName.NEGATIVE_CONTROLS:
      if (outcomeType === OutcomeType.BINARY && sampleSize >= 500) return TestSeverity.CRITICAL;
      if (outcomeType === OutcomeType.BINARY && sampleSize >= 100) return TestSeverity.HIGH;
      if (outcomeType === OutcomeType.CONTINUOUS && sampleSize >= 200) return TestSeverity.HIGH;
      return TestSeverity.MODERATE;
    case TestName.OUT_OF_SAMPLE:
      if (sampleSize >= 1000) return TestSeverity.HIGH;
      if (sampleSize >= 500) return TestSeverity.MODERATE;
      return TestSeverity.LOW;
    case TestName.TEMPORAL_ROBUSTNESS:
      return hasTimeVariable === true ? TestSeverity.CRITICAL : TestSeverity.LOW;
    case TestName.SPEC_SENSITIVITY:
      return TestSeverity.CRITICAL;
    default:
      return TestSeverity.MODERATE;
  }
}

/**
 * Generate a minimal test battery for quick screening
 * Used for exploratory analysis or when compute resources are limited
 */
export function generateMinimalBattery(
  outcomeType: OutcomeType,
  sampleSize: number,
  hasTimeVariable: boolean
): TestSelectionResult {
  // Always include the 2 critical tests + alt explanations
  // Skip OOS and negative controls for small samples, skip temporal if no time var
  
  // Override to create minimal battery
  const criticalTests = [TestName.PLACEBO, TestName.SPEC_SENSITIVITY, TestName.ALTERNATIVE_EXPLANATIONS];
  const minimalSelected = outcomeType === OutcomeType.BINARY && sampleSize >= 100
    ? criticalTests.concat([TestName.NEGATIVE_CONTROLS])
    : criticalTests;
  
  const minimalSkipped = new Set<TestName>();
  if (!hasTimeVariable) minimalSkipped.add(TestName.TEMPORAL_ROBUSTNESS);
  if (sampleSize < 500) minimalSkipped.add(TestName.OUT_OF_SAMPLE);
  if (outcomeType === OutcomeType.BINARY && sampleSize < 100) minimalSkipped.add(TestName.NEGATIVE_CONTROLS);
  
  return {
    selectedTests: minimalSelected.filter(t => !minimalSkipped.has(t)),
    skippedTests: Array.from(minimalSkipped),
    rationale: {
      [TestName.PLACEBO]: 'Always critical for false positive detection',
      [TestName.SPEC_SENSITIVITY]: 'Always critical for specification sensitivity',
      [TestName.ALTERNATIVE_EXPLANATIONS]: 'Always critical for causal inference',
      [TestName.NEGATIVE_CONTROLS]: outcomeType === OutcomeType.BINARY && sampleSize >= 100
        ? 'Included for binary outcome with moderate sample'
        : 'Skipped: insufficient sample size',
      [TestName.OUT_OF_SAMPLE]: sampleSize >= 500
        ? 'Included if sample permits'
        : 'Skipped: insufficient power',
      [TestName.TEMPORAL_ROBUSTNESS]: hasTimeVariable ? 'Included if time variable present' : 'Skipped: no time variable'
    },
    expectedCoverage: 0.5 // 3 of 6 tests = 50% coverage for minimal battery
  };
}

/**
 * Generate a full protocol battery for confirmatory analysis
 * Used for final reports, policy briefs, peer review
 */
export function generateFullBattery(
  data: CaseStatistics[],
  outcomeType: OutcomeType,
  characteristics: DataCharacteristics
): TestSelectionResult {
  return selectTests(data, outcomeType, characteristics);
}