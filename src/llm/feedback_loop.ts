/**
 * Iterative Refinement Feedback Loop for LLM Statistical Inquiry
 *
 * Closes the loop between an LLM response and the data that produced it:
 * - Validates that claims in a response are actually supported by the data
 * - Scores the confidence of an interpretation
 * - Refines a prompt based on what went wrong in the previous attempt
 * - Tracks refinement history so a reviewer can audit the reasoning path
 */

import { RAnalysisResult } from '../r-interface/r_bridge';
import { CaseStatistics } from '../statistical/statistical_analysis';
import { OutcomeType } from '../statistical/adaptive_disconfirmation';
import {
  ExpertiseLevel,
  DataCharacteristics,
  PromptContext,
  GeneratedPrompt,
  generateContextAwarePrompt,
  detectExpertiseLevel,
  detectQuestionType,
  analyzeDataCharacteristics
} from './context_aware_prompts';

export enum ValidationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

export enum ValidationCategory {
  FABRICATION = 'fabrication',
  OVERCLAIM = 'overclaim',
  MISSING_LIMITATION = 'missing_limitation',
  STATISTICAL_ERROR = 'statistical_error',
  UNSUPPORTED_CLAIM = 'unsupported_claim'
}

export interface ValidationIssue {
  category: ValidationCategory;
  severity: ValidationSeverity;
  message: string;
  /** The phrase or claim in the response that triggered this issue */
  trigger?: string;
  suggestion: string;
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  /** Fraction of claims that survived validation, 0-1 */
  claimSupportRate: number;
  score: number;
}

export interface ConfidenceScore {
  /** Overall confidence in the interpretation, 0-1 */
  confidence: number;
  components: {
    statisticalStrength: number;
    sampleAdequacy: number;
    dataQuality: number;
    disconfirmationStatus: number;
    claimCalibration: number;
  };
  level: 'low' | 'moderate' | 'high';
  reasoning: string[];
}

export interface RefinementSuggestion {
  type: 'add_context' | 'add_requirement' | 'change_expertise' | 'narrow_scope' | 'add_disconfirmation' | 'add_data_warning';
  instruction: string;
  rationale: string;
}

export interface RefinementRound {
  round: number;
  originalPrompt: string;
  refinedPrompt: string;
  appliedSuggestions: RefinementSuggestion[];
  validationBefore: ValidationReport;
  validationAfter: ValidationReport;
  confidenceBefore: number;
  confidenceAfter: number;
}

export interface FeedbackLoopResult {
  finalPrompt: GeneratedPrompt;
  rounds: RefinementRound[];
  totalRounds: number;
  converged: boolean;
  finalConfidence: number;
}

// ============================================================================
// Claim Extraction
// ============================================================================

/**
 * A claim extracted from a response, with the numeric assertion it makes.
 */
export interface ExtractedClaim {
  text: string;
  kind: 'p_value' | 'effect_size' | 'confidence_interval' | 'significance' | 'causal' | 'other';
  value?: number;
  lowerBound?: number;
  upperBound?: number;
}

/**
 * Extract checkable numeric claims from a free-text response.
 *
 * Deliberately conservative: only patterns that carry an unambiguous numeric
 * assertion are extracted, because a mis-parsed claim would produce a false
 * validation failure.
 */
export function extractClaims(response: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];

  // p-value: p = 0.032, p < 0.05, p-value: 0.001, p-value was 0.02
  const pValuePattern = /\bp(?:\s*-\s*value)?\s*(?:=|is|was|of|:)?\s*(0?\.\d+|1\.0+|\d+e-\d+)/gi;
  let match: RegExpExecArray | null;
  while ((match = pValuePattern.exec(response)) !== null) {
    const value = parseFloat(match[1]);
    if (!Number.isNaN(value)) {
      claims.push({ text: match[0].trim(), kind: 'p_value', value });
    }
  }

  // Confidence interval: 95% CI [0.12, 0.45], CI was 0.12 to 0.45
  const ciPattern = /\b(?:95\s*%\s*)?(?:confidence interval|CI)\b\s*(?:=|:|is|was|of)?\s*[\[\(]?\s*(-?\d*\.?\d+)\s*(?:,|to|-)\s*(-?\d*\.?\d+)\s*[\]\)]?/gi;
  while ((match = ciPattern.exec(response)) !== null) {
    const lower = parseFloat(match[1]);
    const upper = parseFloat(match[2]);
    if (!Number.isNaN(lower) && !Number.isNaN(upper)) {
      claims.push({
        text: match[0].trim(),
        kind: 'confidence_interval',
        lowerBound: Math.min(lower, upper),
        upperBound: Math.max(lower, upper)
      });
    }
  }

  // Effect size: effect size = 0.42, odds ratio is 1.8
  const effectPattern = /\b(?:effect size|odds ratio|risk ratio|correlation)\b\s*(?:=|:|is|was|of)?\s*(-?\d*\.?\d+)/gi;
  while ((match = effectPattern.exec(response)) !== null) {
    const value = parseFloat(match[1]);
    if (!Number.isNaN(value)) {
      claims.push({ text: match[0].trim(), kind: 'effect_size', value });
    }
  }

  // Causal language
  const causalPattern = /\b(causes?|caused by|causal(?:ly)? (?:determines?|drives?|explains?)|proves?|demonstrates that|because of \w+)\b/gi;
  while ((match = causalPattern.exec(response)) !== null) {
    claims.push({ text: match[0].trim(), kind: 'causal' });
  }

  // Significance assertions
  const sigPattern = /\b(statistically significant|not statistically significant|significant at)\b/gi;
  while ((match = sigPattern.exec(response)) !== null) {
    claims.push({ text: match[0].trim(), kind: 'significance' });
  }

  return claims;
}

// ============================================================================
// Result Validation
// ============================================================================

/**
 * Validate a response against the analysis result it claims to describe.
 */
export function validateResponse(
  response: string,
  result: RAnalysisResult
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const claims = extractClaims(response);

  let checkedClaims = 0;
  let supportedClaims = 0;

  const actualP = result.p_value;
  const actualEffect = result.effect_size;
  const actualLo = result.confidence_interval[0];
  const actualHi = result.confidence_interval[1];

  for (const claim of claims) {
    if (claim.kind === 'p_value' && claim.value !== undefined) {
      checkedClaims++;
      // A reported p-value is a point estimate. It must land on the same side
      // of 0.05 as the computed value AND agree to within rounding distance;
      // a plausible-but-wrong number is still a fabrication.
      const reportedSignificant = claim.value < 0.05;
      const actualSignificant = actualP < 0.05;
      const roundingTolerance = Math.max(Math.abs(actualP) * 0.5, 0.005);
      const differs = Math.abs(claim.value - actualP) > roundingTolerance;

      if (reportedSignificant !== actualSignificant) {
        issues.push({
          category: ValidationCategory.FABRICATION,
          severity: ValidationSeverity.ERROR,
          message: `Reported p-value (${claim.value}) contradicts the computed p-value (${actualP.toFixed(6)}) on statistical significance.`,
          trigger: claim.text,
          suggestion: 'Report the p-value exactly as computed by the analysis.'
        });
      } else if (differs) {
        issues.push({
          category: ValidationCategory.FABRICATION,
          severity: ValidationSeverity.ERROR,
          message: `Reported p-value (${claim.value}) does not match the computed p-value (${actualP.toFixed(6)}).`,
          trigger: claim.text,
          suggestion: 'Report the p-value exactly as computed by the analysis.'
        });
      } else {
        supportedClaims++;
      }
    } else if (claim.kind === 'confidence_interval' && claim.lowerBound !== undefined && claim.upperBound !== undefined) {
      checkedClaims++;
      const overlapsActual =
        claim.lowerBound <= actualHi && claim.upperBound >= actualLo;
      const sameNullSide =
        (claim.lowerBound <= 0 && claim.upperBound >= 0) === (actualLo <= 0 && actualHi >= 0);
      if (!overlapsActual || !sameNullSide) {
        issues.push({
          category: ValidationCategory.FABRICATION,
          severity: ValidationSeverity.ERROR,
          message: `Reported confidence interval [${claim.lowerBound}, ${claim.upperBound}] does not overlap the computed interval [${actualLo.toFixed(4)}, ${actualHi.toFixed(4)}].`,
          trigger: claim.text,
          suggestion: 'Report the confidence interval exactly as computed by the analysis.'
        });
      } else {
        // The interval is compatible with the finding but its bounds are not the
        // ones the analysis produced. Flag it as a misstatement, not a
        // fabrication: the conclusion still holds.
        const boundOff =
          Math.abs(claim.lowerBound - actualLo) > Math.max(Math.abs(actualLo) * 0.1, 0.01) ||
          Math.abs(claim.upperBound - actualHi) > Math.max(Math.abs(actualHi) * 0.1, 0.01);
        if (boundOff) {
          issues.push({
            category: ValidationCategory.STATISTICAL_ERROR,
            severity: ValidationSeverity.WARNING,
            message: `Reported confidence interval [${claim.lowerBound}, ${claim.upperBound}] is not the computed interval [${actualLo.toFixed(4)}, ${actualHi.toFixed(4)}].`,
            trigger: claim.text,
            suggestion: 'Copy the confidence interval verbatim from the analysis output rather than approximating it.'
          });
        } else {
          supportedClaims++;
        }
      }
    } else if (claim.kind === 'effect_size' && claim.value !== undefined) {
      checkedClaims++;
      const tolerance = Math.max(Math.abs(actualEffect) * 0.5, 0.05);
      if (Math.abs(claim.value - actualEffect) > tolerance) {
        issues.push({
          category: ValidationCategory.FABRICATION,
          severity: ValidationSeverity.ERROR,
          message: `Reported effect size (${claim.value}) does not match the computed effect size (${actualEffect.toFixed(4)}).`,
          trigger: claim.text,
          suggestion: 'Report the effect size exactly as computed by the analysis.'
        });
      } else {
        supportedClaims++;
      }
    } else if (claim.kind === 'causal') {
      checkedClaims++;
      issues.push({
        category: ValidationCategory.OVERCLAIM,
        severity: ValidationSeverity.WARNING,
        message: `Causal language ("${claim.text}") used for an observational result that cannot support causal inference.`,
        trigger: claim.text,
        suggestion: 'Use associational language ("is associated with", "differs across") and state explicitly that causation was not established.'
      });
    } else if (claim.kind === 'significance') {
      checkedClaims++;
      const claimsSignificant = /not statistically significant/i.test(claim.text);
      const actualSignificant = actualP < 0.05;
      if (claimsSignificant === actualSignificant) {
        // The response claims significance in the opposite direction
        issues.push({
          category: ValidationCategory.OVERCLAIM,
          severity: ValidationSeverity.ERROR,
          message: `Response states "${claim.text}" but the computed p-value is ${actualP.toFixed(6)}.`,
          trigger: claim.text,
          suggestion: 'Align the significance statement with the computed p-value.'
        });
      } else {
        supportedClaims++;
      }
    }
  }

  // Missing limitations
  const limitationMarkers = [
    'limitation', 'caveat', 'does not establish causation', 'confound',
    'cannot be considered', 'should not', 'unmeasured', 'not causal'
  ];
  const hasLimitations = limitationMarkers.some(m => response.toLowerCase().includes(m));
  if (!hasLimitations && checkedClaims > 0) {
    issues.push({
      category: ValidationCategory.MISSING_LIMITATION,
      severity: ValidationSeverity.WARNING,
      message: 'Response contains no stated limitations or caveats.',
      suggestion: 'Add an explicit limitations paragraph naming confounders, sample constraints, and the limits of causal inference.'
    });
  }

  // Deterministic language
  const deterministicTerms = ['proves', 'proved', 'definitively', 'conclusively shows', 'without doubt', 'certainly'];
  for (const term of deterministicTerms) {
    if (response.toLowerCase().includes(term)) {
      issues.push({
        category: ValidationCategory.OVERCLAIM,
        severity: ValidationSeverity.WARNING,
        message: `Deterministic language ("${term}") used where probabilistic language is required.`,
        trigger: term,
        suggestion: 'Replace with probabilistic language ("is consistent with", "provides evidence for").'
      });
    }
  }

  const claimSupportRate = checkedClaims > 0 ? supportedClaims / checkedClaims : 1;
  const errorCount = issues.filter(i => i.severity === ValidationSeverity.ERROR).length;
  const warningCount = issues.filter(i => i.severity === ValidationSeverity.WARNING).length;

  const score = Math.max(
    0,
    Math.min(1, claimSupportRate - errorCount * 0.2 - warningCount * 0.05)
  );

  return {
    valid: errorCount === 0 && claimSupportRate >= 0.8,
    issues,
    claimSupportRate,
    score
  };
}

// ============================================================================
// Confidence Scoring
// ============================================================================

/**
 * Score the confidence of an interpretation, decomposing it into components.
 */
export function scoreConfidence(
  result: RAnalysisResult,
  response: string,
  dataCharacteristics?: DataCharacteristics
): ConfidenceScore {
  const reasoning: string[] = [];

  // Statistical strength: effect size relative to noise, plus significance
  const ciWidth = result.confidence_interval[1] - result.confidence_interval[0];
  const relativeWidth = result.effect_size !== 0 ? ciWidth / Math.abs(result.effect_size) : Infinity;
  let statisticalStrength = 0.5;
  if (result.p_value < 0.01) {
    statisticalStrength = 0.9;
    reasoning.push('p-value below 0.01 provides strong statistical evidence.');
  } else if (result.p_value < 0.05) {
    statisticalStrength = 0.75;
    reasoning.push('p-value below 0.05 provides conventional statistical evidence.');
  } else {
    statisticalStrength = 0.25;
    reasoning.push('p-value above 0.05 does not support the finding.');
  }
  if (relativeWidth < 1) {
    statisticalStrength = Math.min(1, statisticalStrength + 0.1);
    reasoning.push('Confidence interval is narrow relative to the effect size.');
  } else if (relativeWidth > 2) {
    statisticalStrength = Math.max(0, statisticalStrength - 0.15);
    reasoning.push('Confidence interval is wide relative to the effect size.');
  }

  // Sample adequacy
  let sampleAdequacy = 0.5;
  if (dataCharacteristics) {
    const n = dataCharacteristics.sampleSize;
    if (n >= 1000) {
      sampleAdequacy = 0.95;
    } else if (n >= 500) {
      sampleAdequacy = 0.8;
    } else if (n >= 200) {
      sampleAdequacy = 0.65;
    } else if (n >= 100) {
      sampleAdequacy = 0.5;
    } else {
      sampleAdequacy = 0.3;
      reasoning.push('Sample size is small; findings will have limited precision.');
    }
  } else {
    sampleAdequacy = 0.5;
  }

  // Data quality
  let dataQuality = 0.8;
  if (dataCharacteristics) {
    if (dataCharacteristics.missingRate > 0.2) {
      dataQuality = 0.4;
      reasoning.push('Missing data rate above 20% materially weakens inference.');
    } else if (dataCharacteristics.missingRate > 0.1) {
      dataQuality = 0.6;
      reasoning.push('Missing data rate above 10% requires explicit handling.');
    }
    if (dataCharacteristics.hasSmallGroups) {
      dataQuality = Math.max(0.3, dataQuality - 0.1);
      reasoning.push('Some comparison groups have fewer than 30 cases.');
    }
  }

  // Disconfirmation status
  let disconfirmationStatus = 0.5;
  if (result.disconfirmation_tests) {
    const ratio = result.disconfirmation_tests.tests_total > 0
      ? result.disconfirmation_tests.tests_passed / result.disconfirmation_tests.tests_total
      : 0;
    disconfirmationStatus = ratio;
    if (result.disconfirmation_tests.passed) {
      reasoning.push(`Finding passed disconfirmation testing (${result.disconfirmation_tests.tests_passed}/${result.disconfirmation_tests.tests_total}).`);
    } else {
      reasoning.push(`Finding failed disconfirmation testing (${result.disconfirmation_tests.tests_passed}/${result.disconfirmation_tests.tests_total}).`);
    }
  }

  // Claim calibration: does the response's confidence match its evidence?
  const validation = validateResponse(response, result);
  const claimCalibration = validation.score;
  if (validation.issues.length > 0) {
    reasoning.push(`Response has ${validation.issues.length} validation issue(s).`);
  }

  const confidence = (
    statisticalStrength * 0.30 +
    sampleAdequacy * 0.20 +
    dataQuality * 0.20 +
    disconfirmationStatus * 0.20 +
    claimCalibration * 0.10
  );

  const level: 'low' | 'moderate' | 'high' =
    confidence >= 0.75 ? 'high' : confidence >= 0.5 ? 'moderate' : 'low';

  return {
    confidence: Math.max(0, Math.min(1, confidence)),
    components: {
      statisticalStrength,
      sampleAdequacy,
      dataQuality,
      disconfirmationStatus,
      claimCalibration
    },
    level,
    reasoning
  };
}

// ============================================================================
// Refinement
// ============================================================================

/**
 * Derive refinement suggestions from a validation report.
 */
export function deriveRefinementSuggestions(
  validation: ValidationReport,
  context: PromptContext
): RefinementSuggestion[] {
  const suggestions: RefinementSuggestion[] = [];

  for (const issue of validation.issues) {
    if (issue.category === ValidationCategory.FABRICATION) {
      suggestions.push({
        type: 'add_requirement',
        instruction: 'State explicitly: "Use only the numeric values provided in the Statistical Results section. Do not recompute, round differently, or substitute values from memory."',
        rationale: 'The previous response reported numbers that contradict the analysis output.'
      });
    } else if (issue.category === ValidationCategory.OVERCLAIM) {
      suggestions.push({
        type: 'add_requirement',
        instruction: 'Use only associational language. Never write "causes", "proves", or "definitively". State that the analysis is observational and cannot establish causation.',
        rationale: 'The previous response overstated what the analysis supports.'
      });
    } else if (issue.category === ValidationCategory.MISSING_LIMITATION) {
      suggestions.push({
        type: 'add_requirement',
        instruction: 'Include an explicit limitations paragraph naming confounders, sample constraints, unmeasured factors, and the limits of causal inference.',
        rationale: 'The previous response omitted required limitations.'
      });
    } else if (issue.category === ValidationCategory.STATISTICAL_ERROR) {
      suggestions.push({
        type: 'add_requirement',
        instruction: 'Copy the p-value and confidence interval verbatim from the Statistical Results section, including all decimal places shown.',
        rationale: 'The previous response reported a p-value at the wrong magnitude.'
      });
    }
  }

  if (context.data.sampleSize < 100) {
    suggestions.push({
      type: 'add_data_warning',
      instruction: 'State at the top of the response that the sample is small (n < 100) and that all estimates are imprecise.',
      rationale: 'Small samples require the limitation to lead rather than trail the response.'
    });
  }

  if (context.data.missingRate > 0.1) {
    suggestions.push({
      type: 'add_context',
      instruction: `Describe how the ${(context.data.missingRate * 100).toFixed(1)}% missing data rate was handled and what direction of bias it could introduce.`,
      rationale: 'Missing data must be surfaced in the response, not just the prompt.'
    });
  }

  if (context.expertiseLevel === ExpertiseLevel.EXPERT) {
    suggestions.push({
      type: 'narrow_scope',
      instruction: 'Restrict the response to the specific estimand asked about. Do not generalize beyond the estimated population.',
      rationale: 'Expert-level requests need scope control to prevent overreach.'
    });
  }

  // Deduplicate by type+instruction
  const seen = new Set<string>();
  return suggestions.filter(s => {
    const key = s.type + '|' + s.instruction;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Apply refinement suggestions to a prompt context, producing a new context.
 */
export function applyRefinements(
  context: PromptContext,
  suggestions: RefinementSuggestion[]
): PromptContext {
  const requirementAdditions: string[] = [];
  let expertiseLevel = context.expertiseLevel;
  let disconfirmationRequired = false;

  for (const s of suggestions) {
    if (s.type === 'add_requirement') {
      requirementAdditions.push(s.instruction);
    } else if (s.type === 'change_expertise') {
      expertiseLevel = s.instruction as ExpertiseLevel;
    } else if (s.type === 'add_disconfirmation') {
      disconfirmationRequired = true;
    }
  }

  const refined: PromptContext = {
    ...context,
    expertiseLevel,
    forceDisconfirmation: context.forceDisconfirmation || disconfirmationRequired,
    data: { ...context.data }
  };

  if (requirementAdditions.length > 0) {
    refined.priorAnalyses = [
      ...(context.priorAnalyses ?? []),
      ...requirementAdditions
    ];
  }

  return refined;
}

// ============================================================================
// Feedback Loop
// ============================================================================

/**
 * Run the iterative refinement loop until the response validates or the
 * maximum number of rounds is reached.
 */
export function runFeedbackLoop(
  context: PromptContext,
  result: RAnalysisResult,
  responses: string[],
  maxRounds: number = 3,
  convergenceThreshold: number = 0.8
): FeedbackLoopResult {
  const rounds: RefinementRound[] = [];
  let currentContext = { ...context };
  let currentPrompt = generateContextAwarePrompt(context.question, currentContext);
  let currentResponse = responses.length > 0 ? responses[0] : '';
  let currentValidation = validateResponse(currentResponse, result);
  let currentConfidence = scoreConfidence(result, currentResponse, context.data).confidence;

  let converged = currentValidation.score >= convergenceThreshold;

  for (let round = 1; round <= maxRounds && !converged; round++) {
    const suggestions = deriveRefinementSuggestions(currentValidation, currentContext);
    if (suggestions.length === 0) {
      break;
    }

    const refinedContext = applyRefinements(currentContext, suggestions);
    const refinedPrompt = generateContextAwarePrompt(context.question, refinedContext);

    // The next response is either supplied by the caller (responses[round])
    // or, if none remain, we carry forward the prior response so the loop
    // still produces a comparable before/after record.
    const nextResponse = responses.length > round ? responses[round] : currentResponse;
    const nextValidation = validateResponse(nextResponse, result);
    const nextConfidence = scoreConfidence(result, nextResponse, refinedContext.data).confidence;

    rounds.push({
      round,
      originalPrompt: currentPrompt.prompt,
      refinedPrompt: refinedPrompt.prompt,
      appliedSuggestions: suggestions,
      validationBefore: currentValidation,
      validationAfter: nextValidation,
      confidenceBefore: currentConfidence,
      confidenceAfter: nextConfidence
    });

    currentContext = refinedContext;
    currentPrompt = refinedPrompt;
    currentResponse = nextResponse;
    currentValidation = nextValidation;
    currentConfidence = nextConfidence;

    converged = nextValidation.score >= convergenceThreshold;
  }

  return {
    finalPrompt: currentPrompt,
    rounds,
    totalRounds: rounds.length,
    converged,
    finalConfidence: currentConfidence
  };
}

/**
 * Convenience wrapper: build a context from raw data, run the loop, and
 * return the refined prompt along with the audit trail.
 */
export function refineFromData(
  question: string,
  cases: CaseStatistics[],
  result: RAnalysisResult,
  responses: string[],
  options?: {
    jurisdiction?: string;
    timePeriod?: string;
    outcomeType?: OutcomeType;
    hasTimeVariable?: boolean;
    maxRounds?: number;
  }
): FeedbackLoopResult {
  const dataCharacteristics = analyzeDataCharacteristics(
    cases,
    options?.outcomeType ?? OutcomeType.BINARY,
    options?.hasTimeVariable ?? false
  );

  const context: PromptContext = {
    jurisdiction: options?.jurisdiction ?? 'Unknown jurisdiction',
    timePeriod: options?.timePeriod ?? 'Unknown period',
    question,
    questionType: detectQuestionType(question),
    expertiseLevel: detectExpertiseLevel(question, responses.length > 1),
    data: dataCharacteristics
  };

  return runFeedbackLoop(context, result, responses, options?.maxRounds ?? 3);
}
