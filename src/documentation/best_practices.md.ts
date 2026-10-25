/**
 * Best Practices Guide
 *
 * Methodological guidelines, common analysis pitfalls, and recommended
 * workflows for using the Akashic Civics platform effectively.
 */

export interface BestPractice {
  id: string;
  title: string;
  category: 'data' | 'analysis' | 'interpretation' | 'reporting';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  rationale: string;
  example?: string;
}

export interface Pitfall {
  id: string;
  title: string;
  category: 'data' | 'analysis' | 'interpretation' | 'reporting';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  howToAvoid: string;
  example: string;
}

export interface WorkflowStep {
  step: number;
  name: string;
  description: string;
  tools: string[];
  outputs: string[];
}

/** Best practices for analysis */
export const BEST_PRACTICES: BestPractice[] = [
  {
    id: 'bp-validate-data',
    title: 'Validate data before analysis',
    category: 'data',
    severity: 'critical',
    description: 'Always validate data quality, missingness, and field types before running statistical analyses.',
    rationale: 'Invalid data produces invalid results - garbage in, garbage out. Missing convictions or undefined race fields can bias disparity estimates.',
    example: `const stats = computeDescriptiveStatistics(cases);
if (stats.case_count === 0) {
  throw new Error('No valid cases found');
}`
  },
  {
    id: 'bp-report-confidence-intervals',
    title: 'Always report confidence intervals',
    category: 'analysis',
    severity: 'high',
    description: 'Report confidence intervals alongside point estimates, not just p-values.',
    rationale: 'P-values alone do not convey the magnitude or precision of an effect. Confidence intervals communicate both statistical significance and practical importance.',
    example: `const ztest = performTwoProportionZTest(p1, n1, p2, n2);
console.log(\`Effect: \${ztest.effect_size.toFixed(3)}\`);
console.log(\`95% CI: [\${ztest.confidence_interval[0].toFixed(3)}, \${ztest.confidence_interval[1].toFixed(3)}]\`);`
  },
  {
    id: 'bp-adjust-multiple-comparisons',
    title: 'Adjust for multiple comparisons',
    category: 'analysis',
    severity: 'high',
    description: 'Use Bonferroni, Benjamini-Hochberg, or other corrections when running multiple hypothesis tests.',
    rationale: 'Running many tests without adjustment inflates the family-wise error rate, producing false positives.',
    example: `import { MultipleComparisonCorrection } from 'akashic-civics/statistical';
const adj = new MultipleComparisonCorrection({ method: 'benjamini-hochberg' });
const adjusted = adj.adjust(pValues);`
  },
  {
    id: 'bp-check-assumptions',
    title: 'Check model assumptions',
    category: 'analysis',
    severity: 'high',
    description: 'Verify linearity, independence, homoscedasticity, and normality assumptions before interpreting regression results.',
    rationale: 'Violated assumptions invalidate standard errors, p-values, and confidence intervals.',
    example: `import { RegressionDiagnostics } from 'akashic-civics/statistical';
const diagnostics = new RegressionDiagnostics(results);
diagnostics.checkLinearity();
diagnostics.checkHomoscedasticity();
diagnostics.checkNormality();`
  },
  {
    id: 'bp-use-propensity-matching',
    title: 'Use propensity score matching for observational comparisons',
    category: 'analysis',
    severity: 'medium',
    description: 'When comparing jurisdictions or groups, use propensity score matching to control for case-mix differences.',
    rationale: 'Raw comparisons between jurisdictions with different case mixes can produce spurious disparity findings.',
    example: `import { CausalInference } from 'akashic-civics/statistical';
const causal = new CausalInference();
const matched = causal.propensityScoreMatch(cases, {
  treatment: 'race_ethnicity === Black',
  covariates: ['offense_severity', 'prior_convictions', 'age']
});`
  },
  {
    id: 'bp-run-disconfirmation-tests',
    title: 'Run the full disconfirmation battery',
    category: 'analysis',
    severity: 'high',
    description: 'Always run the complete set of disconfirmation tests (placebo, specification sensitivity, negative controls, etc.), not just a subset.',
    rationale: 'Partial testing leaves room for alternative explanations to undermine your findings.',
    example: `import { AdaptiveDisconfirmation } from 'akashic-civics/statistical';
const disc = new AdaptiveDisconfirmation();
const results = await disc.runFullBattery(cases, dataCharacteristics);
console.log(\`Disconfirmation score: \${results.aggregatedScore}\`);`
  },
  {
    id: 'bp-report-effect-sizes',
    title: 'Report effect sizes, not just significance',
    category: 'reporting',
    severity: 'high',
    description: 'Always accompany statistical significance with effect size measures (Cohen\'s h, odds ratios, risk differences).',
    rationale: 'Statistical significance does not imply practical importance. A tiny effect can be significant with large N.',
    example: `console.log(\`Cohen's h: \${calculateEffectSize(p1, p2)}\`);
console.log(\`Odds ratio: \${calculateOddsRatio(...).toFixed(3)}\`);`
  },
  {
    id: 'bp-small-sample-correction',
    title: 'Apply small sample corrections',
    category: 'analysis',
    severity: 'medium',
    description: 'Use small-sample corrections (t-distribution instead of normal, Fisher exact instead of chi-square) when N < 30 per group.',
    rationale: 'Normal approximations are unreliable with small samples, inflating Type I error rates.',
    example: `import { StatisticalTesting } from 'akashic-civics/accountability';
const test = new StatisticalTesting();
const result = test.fisherExact(a, b, c, d); // Preferred over chi-square for small N`
  },
  {
    id: 'bp-document-provenance',
    title: 'Document analysis provenance',
    category: 'reporting',
    severity: 'medium',
    description: 'Record data source, analysis code, versions, and timestamps for every published result.',
    rationale: 'Reproducibility requires knowing exactly how results were produced.',
    example: `import { ProvenanceTracker } from 'akashic-civics/provenance';
const tracker = new ProvenanceTracker();
tracker.recordAnalysis({
  dataSource: 'cases.jsonl',
  analysisVersion: 'v1.12',
  timestamp: new Date().toISOString()
});`
  }
];

/** Common analysis pitfalls */
export const COMMON_PITFALLS: Pitfall[] = [
  {
    id: 'pf-ecological-fallacy',
    title: 'Ecological fallacy',
    category: 'interpretation',
    severity: 'critical',
    description: 'Drawing conclusions about individuals from aggregate (jurisdiction-level) data.',
    howToAvoid: 'Use individual-level (case-level) analysis. If using aggregate data, explicitly state that findings apply to jurisdictions, not individuals.',
    example: 'PITFALL: "County X has high Black conviction rate, therefore Black individuals in County X are more likely to be convicted."\nCORRECT: "County X has higher conviction rates overall; case-level analysis is needed to assess racial disparities."'
  },
  {
    id: 'pf-omitted-variable-bias',
    title: 'Omitted variable bias',
    category: 'analysis',
    severity: 'critical',
    description: 'Leaving out important confounders from regression models, producing biased coefficients.',
    howToAvoid: 'Include all theoretically relevant covariates (offense severity, prior record, demographics) in regression models. Use propensity score matching as a robustness check.',
    example: 'PITFALL: Regressing conviction on race only, without controlling for offense severity.\nCORRECT: Include offense_severity, prior_convictions, and age as covariates.'
  },
  {
    id: 'pf-p-hacking',
    title: 'P-hacking / specification searching',
    category: 'interpretation',
    severity: 'high',
    description: 'Trying many model specifications and reporting only the ones that yield significant results.',
    howToAvoid: 'Pre-specify your analysis plan. Report all specifications tried. Use specification sensitivity analysis to check robustness.',
    example: 'PITFALL: Trying 10 different covariate sets and reporting only the one with p < 0.05.\nCORRECT: Pre-register your specification; report all tried models in supplementary materials.'
  },
  {
    id: 'pf-ignoring-clustering',
    title: 'Ignoring clustering',
    category: 'analysis',
    severity: 'high',
    description: 'Treating cases as independent when they are clustered within judges, jurisdictions, or time periods.',
    howToAvoid: 'Use cluster-robust standard errors or mixed-effects models with random effects for clustering variables.',
    example: 'PITFALL: Standard errors from OLS assuming independent cases.\nCORRECT: Cluster standard errors by jurisdiction; use mixed models with judge random effects.'
  },
  {
    id: 'pf-missing-not-random',
    title: 'Ignoring missing data mechanisms',
    category: 'data',
    severity: 'high',
    description: 'Dropping cases with missing values without considering whether missingness is random.',
    howToAvoid: 'Analyze missingness patterns. Use multiple imputation if missingness is MAR (missing at random). Sensitivity analysis for MNAR.',
    example: 'PITFALL: cases.filter(c => c.conviction !== null) drops 30% of data.\nCORRECT: Check if missingness correlates with race/severity; use imputation if needed.'
  },
  {
    id: 'pf-confusing-correlation',
    title: 'Confusing correlation with causation',
    category: 'interpretation',
    severity: 'critical',
    description: 'Interpreting statistical associations as causal effects without identification strategy.',
    howToAvoid: 'Use causal inference methods (propensity matching, difference-in-differences, instrumental variables) for causal claims. Label observational associations clearly.',
    example: 'PITFALL: "Race causes higher conviction rates."\nCORRECT: "Black defendants have higher conviction rates in this dataset; causal claims require identification strategy."'
  },
  {
    id: 'pf-small-sample-overinterpretation',
    title: 'Overinterpreting small sample results',
    category: 'analysis',
    severity: 'medium',
    description: 'Drawing strong conclusions from analyses with very few cases per group.',
    howToAvoid: 'Report sample sizes per group. Use exact tests (Fisher exact) for small cells. Flag results with N < 30 per group as preliminary.',
    example: 'PITFALL: Concluding disparity from 2 Black cases vs 50 White cases.\nCORRECT: Report cell sizes; use Fisher exact test; flag as preliminary.'
  },
  {
    id: 'pf-multiple-testing-no-adjustment',
    title: 'Multiple testing without adjustment',
    category: 'analysis',
    severity: 'high',
    description: 'Running many tests and interpreting each at alpha = 0.05 without correction.',
    howToAvoid: 'Apply Bonferroni, Benjamini-Hochberg, or Holm corrections. Report adjusted p-values alongside raw p-values.',
    example: `import { MultipleComparisonCorrection } from 'akashic-civics/statistical';
const adj = new MultipleComparisonCorrection({ method: 'bonferroni' });
const adjustedP = adj.adjust([0.01, 0.03, 0.04]); // 0.01 * 3 = 0.03`
  }
];

/** Recommended analysis workflows */
export const RECOMMENDED_WORKFLOWS: WorkflowStep[] = [
  {
    step: 1,
    name: 'Data Loading & Validation',
    description: 'Load dataset, validate field types, check missingness patterns',
    tools: ['DataNormalizer', 'computeDescriptiveStatistics'],
    outputs: ['validated cases', 'missingness report', 'basic stats']
  },
  {
    step: 2,
    name: 'Descriptive Analysis',
    description: 'Compute conviction rates, sentence distributions, demographic breakdowns',
    tools: ['computeDescriptiveStatistics'],
    outputs: ['conviction_rate', 'avg_sentence_months', 'demographic_distribution']
  },
  {
    step: 3,
    name: 'Disconfirmation Testing',
    description: 'Run adaptive disconfirmation battery to test findings against alternative explanations',
    tools: ['AdaptiveDisconfirmation', 'scoring_framework'],
    outputs: ['disconfirmation score', 'passed/skipped tests', 'remediation suggestions']
  },
  {
    step: 4,
    name: 'Regression Modeling',
    description: 'Fit regression models with appropriate covariates and standard errors',
    tools: ['runOLSRegression', 'LogisticRegression', 'SurvivalAnalysis'],
    outputs: ['coefficients', 'standard errors', 'p-values', 'confidence intervals']
  },
  {
    step: 5,
    name: 'Causal Inference',
    description: 'Apply propensity score matching or difference-in-differences for causal claims',
    tools: ['CausalInference', 'propensityScoreMatch', 'diffInDiff'],
    outputs: ['matched sample', 'ATE estimate', 'balance diagnostics']
  },
  {
    step: 6,
    name: 'Benchmarking',
    description: 'Compare jurisdiction results against state/national benchmarks',
    tools: ['computeJurisdictionBenchmark', 'findSimilarJurisdictions'],
    outputs: ['percentile ranking', 'similar jurisdiction matches']
  },
  {
    step: 7,
    name: 'Forecasting & Intervention',
    description: 'Forecast trends and simulate intervention impacts',
    tools: ['exponentialSmoothingForecast', 'simulateIntervention'],
    outputs: ['forecast values', 'intervention effect estimates']
  },
  {
    step: 8,
    name: 'Reporting',
    description: 'Generate stakeholder-appropriate reports (public, technical, policy brief)',
    tools: ['publicSimplifiedMarkdown', 'publicTechnicalMarkdown', 'publicPolicyBriefMarkdown'],
    outputs: ['markdown report', 'HTML', 'JSON']
  }
];

/** Get best practices by category */
export function getBestPracticesByCategory(category: BestPractice['category']): BestPractice[] {
  return BEST_PRACTICES.filter(bp => bp.category === category);
}

/** Get best practices by severity */
export function getBestPracticesBySeverity(severity: BestPractice['severity']): BestPractice[] {
  return BEST_PRACTICES.filter(bp => bp.severity === severity);
}

/** Get pitfalls by category */
export function getPitfallsByCategory(category: Pitfall['category']): Pitfall[] {
  return COMMON_PITFALLS.filter(p => p.category === category);
}

/** Get workflow steps */
export function getWorkflowSteps(): WorkflowStep[] {
  return RECOMMENDED_WORKFLOWS;
}