/**
 * Context-Aware Prompt Generation for LLM Statistical Inquiry
 *
 * Adapts LLM prompts based on:
 * - User expertise level (novice, intermediate, expert)
 * - Data characteristics (sample size, missingness, outcome type)
 * - Analysis context (jurisdiction, time period, question type)
 */

import { CaseStatistics } from '../statistical/statistical_analysis';
import { OutcomeType } from '../statistical/adaptive_disconfirmation';

// Re-export so consumers of DataCharacteristics can reference the outcome type
export { OutcomeType };

export enum ExpertiseLevel {
  NOVICE = 'novice',
  INTERMEDIATE = 'intermediate',
  EXPERT = 'expert'
}

export enum QuestionType {
  DISPARITY = 'disparity',
  CORRELATION = 'correlation',
  CAUSAL = 'causal',
  PREDICTION = 'prediction',
  FORECAST = 'forecast',
  DIAGNOSTIC = 'diagnostic'
}

export interface DataCharacteristics {
  sampleSize: number;
  outcomeType: OutcomeType;
  missingRate: number;
  hasTimeVariable: boolean;
  hasGroupingVariables: boolean;
  hasMissingValues: boolean;
  hasSmallGroups: boolean;
}

export interface PromptContext {
  jurisdiction: string;
  timePeriod: string;
  question: string;
  questionType: QuestionType;
  expertiseLevel: ExpertiseLevel;
  data: DataCharacteristics;
  priorAnalyses?: string[];
  /** Forces the disconfirmation testing block into the prompt regardless of heuristics */
  forceDisconfirmation?: boolean;
}

export interface GeneratedPrompt {
  prompt: string;
  systemPrompt: string;
  estimatedTokens: number;
  expertiseLevel: ExpertiseLevel;
  questionType: QuestionType;
  methodologyRequirements: string[];
  disconfirmationRequired: boolean;
}

export function detectExpertiseLevel(
  question: string,
  hasPriorAnalyses: boolean = false
): ExpertiseLevel {
  const lowerQ = question.toLowerCase();
  const expertTerms = [
    'p-value', 'confidence interval', 'effect size', 'cohen', 'hazard ratio',
    'odds ratio', 'regression', 'logistic', 'survival analysis', 'cox',
    'propensity score', 'difference in differences', 'instrumental variable',
    'sensitivity analysis', 'specification check', 'placebo test'
  ];
  const expertCount = expertTerms.filter(t => lowerQ.includes(t)).length;
  if (expertCount >= 3 || (expertCount >= 1 && hasPriorAnalyses)) {
    return ExpertiseLevel.EXPERT;
  }
  const intermediateTerms = [
    'correlation', 'difference', 'control for', 'adjust', 'regression',
    'sample size', 'confidence', 'bias', 'confound', 'variable', 'rate'
  ];
  const intermediateCount = intermediateTerms.filter(t => lowerQ.includes(t)).length;
  if (expertCount >= 1 || intermediateCount >= 3 || hasPriorAnalyses) {
    return ExpertiseLevel.INTERMEDIATE;
  }
  return ExpertiseLevel.NOVICE;
}

export function detectQuestionType(question: string): QuestionType {
  const lowerQ = question.toLowerCase();
  if (/\b(caused|causes|causal|causation|impact of|effect of|leads to|because of)\b/.test(lowerQ)) {
    return QuestionType.CAUSAL;
  }
  if (/\b(predict|forecast|project|estimate|future)\b/.test(lowerQ)) {
    return QuestionType.PREDICTION;
  }
  if (/\b(forecast|time series|seasonal)\b/.test(lowerQ)) {
    return QuestionType.FORECAST;
  }
  if (/\b(diagnose|identify|detect|why is|root cause)\b/.test(lowerQ)) {
    return QuestionType.DIAGNOSTIC;
  }
  if (/\b(disparity|disparate|bias|inequality|difference between)\b/.test(lowerQ)) {
    return QuestionType.DISPARITY;
  }
  if (/\b(correlat\w*|associat\w*|relationship|linked)\b/.test(lowerQ)) {
    return QuestionType.CORRELATION;
  }
  return QuestionType.DISPARITY;
}

export function analyzeDataCharacteristics(
  cases: CaseStatistics[],
  outcomeType: OutcomeType = OutcomeType.BINARY,
  hasTimeVariable: boolean = false
): DataCharacteristics {
  const n = cases.length;
  let missingCount = 0;
  for (const c of cases) {
    if (c.missing_fields && c.missing_fields.length > 0) {
      missingCount++;
    }
  }
  const missingRate = n > 0 ? missingCount / n : 0;
  const groupCounts: Record<string, number> = {};
  for (const c of cases) {
    if (c.race_ethnicity) {
      groupCounts[c.race_ethnicity] = (groupCounts[c.race_ethnicity] || 0) + 1;
    }
  }
  const hasSmallGroups = Object.values(groupCounts).some(count => count < 30);
  return {
    sampleSize: n,
    outcomeType,
    missingRate,
    hasTimeVariable,
    hasGroupingVariables: Object.keys(groupCounts).length > 0,
    hasMissingValues: missingCount > 0,
    hasSmallGroups
  };
}

export function generateContextAwarePrompt(
  question: string,
  context: PromptContext
): GeneratedPrompt {
  const methodologyRequirements = getMethodologyRequirements(context.questionType, context.expertiseLevel);
  const disconfirmationRequired =
    context.forceDisconfirmation === true ||
    requiresDisconfirmationTesting(context.questionType, context.data);
  const systemPrompt = buildSystemPrompt(context.expertiseLevel);
  const userPrompt = buildUserPrompt(question, context, methodologyRequirements, disconfirmationRequired);
  const estimatedTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
  return {
    prompt: userPrompt,
    systemPrompt,
    estimatedTokens,
    expertiseLevel: context.expertiseLevel,
    questionType: context.questionType,
    methodologyRequirements,
    disconfirmationRequired
  };
}

function getMethodologyRequirements(
  questionType: QuestionType,
  expertise: ExpertiseLevel
): string[] {
  const base: string[] = [];
  if (questionType === QuestionType.CAUSAL) {
    base.push(
      'Distinguish correlation from causation explicitly',
      'Identify and address potential confounders',
      'Discuss identification strategy'
    );
  } else if (questionType === QuestionType.DISPARITY) {
    base.push(
      'Report effect sizes with confidence intervals',
      'Test statistical significance at appropriate alpha level',
      'Address multiple comparison corrections'
    );
  } else {
    base.push(
      'Report effect sizes with confidence intervals',
      'State statistical significance with appropriate alpha'
    );
  }
  if (expertise !== ExpertiseLevel.NOVICE) {
    base.push('Include disconfirmation testing results if applicable');
  }
  return base;
}

function requiresDisconfirmationTesting(
  questionType: QuestionType,
  data: DataCharacteristics
): boolean {
  if (questionType === QuestionType.CAUSAL || questionType === QuestionType.DISPARITY) {
    return true;
  }
  return data.sampleSize >= 100;
}

function buildSystemPrompt(
  expertise: ExpertiseLevel
): string {
  const base = 'You are a rigorous statistical analyst specializing in legal justice research.';
  if (expertise === ExpertiseLevel.EXPERT) {
    return base + ' Communicate at peer-reviewed quantitative social science level with full methodological detail.';
  } else if (expertise === ExpertiseLevel.INTERMEDIATE) {
    return base + ' Balance rigor with accessibility for policy analysis audience.';
  }
  return base + ' Communicate for informed non-specialists using plain language and analogies.';
}

function buildUserPrompt(
  question: string,
  context: PromptContext,
  methodologyRequirements: string[],
  disconfirmationRequired: boolean
): string {
  const parts: string[] = [
    '## Context',
    `- Jurisdiction: ${context.jurisdiction}`,
    `- Time period: ${context.timePeriod}`,
    `- Question type: ${context.questionType}`,
    `- User expertise: ${context.expertiseLevel}`,
    `- Sample size: ${context.data.sampleSize}`,
    `- Outcome type: ${context.data.outcomeType}`,
    `- Missing data rate: ${(context.data.missingRate * 100).toFixed(1)}%`,
    `## Question`,
    question
  ];
  if (context.data.hasTimeVariable) parts.push('- Time variable present: yes');
  if (disconfirmationRequired) {
    parts.push('');
    parts.push('## Disconfirmation Testing Required');
    parts.push('1. Placebo test, 2. Specification sensitivity, 3. Negative controls');
    parts.push('4. Out-of-sample validation, 5. Temporal robustness, 6. Alternative explanations');
  }
  parts.push('');
  parts.push('## Requirements');
  for (const req of methodologyRequirements) {
    parts.push(`- ${req}`);
  }
  parts.push('1. State all effect sizes with confidence intervals');
  parts.push('2. Report p-values with context');
  parts.push('3. List at least 3 alternative explanations');
  parts.push('4. State limitations explicitly');
  parts.push('5. Quantify uncertainty');
  parts.push('6. Report what would falsify this finding');
  return parts.join('\n');
}

export function optimizePromptForData(
  basePrompt: string,
  data: DataCharacteristics
): string {
  const additions: string[] = [];
  if (data.sampleSize < 100) {
    additions.push('\n**Note**: Small sample. Emphasize wide confidence intervals.');
  } else if (data.sampleSize < 500) {
    additions.push('\n**Note**: Moderate sample. Power may be limited.');
  }
  if (data.missingRate > 0.1) {
    additions.push(`\n**Note**: Missing data is ${(data.missingRate * 100).toFixed(1)}%. Address handling method.`);
  }
  if (data.hasSmallGroups) {
    additions.push('\n**Note**: Some groups < 30 cases. Interpret cautiously.');
  }
  if (additions.length === 0) return basePrompt;
  return basePrompt + additions.join('');
}

export function generateBatchPrompts(
  questions: string[],
  baseContext: Omit<PromptContext, 'question'>
): GeneratedPrompt[] {
  return questions.map(q => generateContextAwarePrompt(q, {
    ...baseContext,
    question: q,
    questionType: detectQuestionType(q)
  }));
}

export function summarizePromptCharacteristics(
  prompts: GeneratedPrompt[]
): { totalTokens: number; byExpertise: Record<ExpertiseLevel, number>; 
  byQuestionType: Record<QuestionType, number>; disconfirmationRequired: number } {
  const summary = {
    totalTokens: 0,
    byExpertise: { [ExpertiseLevel.NOVICE]: 0, [ExpertiseLevel.INTERMEDIATE]: 0, [ExpertiseLevel.EXPERT]: 0 },
    byQuestionType: { [QuestionType.DISPARITY]: 0, [QuestionType.CORRELATION]: 0, [QuestionType.CAUSAL]: 0,
      [QuestionType.PREDICTION]: 0, [QuestionType.FORECAST]: 0, [QuestionType.DIAGNOSTIC]: 0 },
    disconfirmationRequired: 0
  };
  for (const p of prompts) {
    summary.totalTokens += p.estimatedTokens;
    summary.byExpertise[p.expertiseLevel]++;
    summary.byQuestionType[p.questionType]++;
    if (p.disconfirmationRequired) summary.disconfirmationRequired++;
  }
  return summary;
}