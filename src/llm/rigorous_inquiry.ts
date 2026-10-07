/**
 * LLM Integration for Rigorous Inquiry
 * 
 * Prompt templates that enforce methodological clarity when using LLMs
 * to analyze legal justice data. Ensures that all AI-generated analysis
 * includes proper statistical reporting, limitations, and uncertainty.
 */

import { RAnalysisResult } from '../r-interface/r_bridge';

export interface AnalysisContext {
  jurisdiction: string;
  timePeriod: string;
  caseCount: number;
  dataQualityScore: number;
  missingDemographicsRate: number;
}

export interface LLMResponse {
  analysis: string;
  effectSize: number;
  pValue: number;
  confidenceInterval: [number, number];
  uncertainty: 'high' | 'moderate' | 'low';
  caveats: string[];
  recommendedFollowUpAnalyses: string[];
}

export class LLMRigorousInquiry {
  /**
   * Generate a rigorous inquiry prompt with methodology requirements
   */
  generateAnalysisPrompt(
    question: string,
    context: AnalysisContext,
    rResult: RAnalysisResult
  ): string {
    return `
You are a rigorous statistical analyst specializing in legal bias analysis.
Answer the following question about legal justice disparities with maximum
methodological integrity.

## Context
- Jurisdiction: ${context.jurisdiction}
- Time period: ${context.timePeriod}
- Case count: ${context.caseCount}
- Data quality score: ${context.dataQualityScore}/100
- Missing demographics rate: ${(context.missingDemographicsRate * 100).toFixed(1)}%

## Statistical Results
- Analysis type: ${rResult.analysis_type}
- Effect size: ${rResult.effect_size.toFixed(4)}
- P-value: ${rResult.p_value.toFixed(4)}
- 95% CI: [${rResult.confidence_interval[0].toFixed(4)}, ${rResult.confidence_interval[1].toFixed(4)}]
- Odds ratio: ${rResult.odds_ratio?.toFixed(4) || 'N/A'}
- Model AIC: ${rResult.model_diagnostics?.aic?.toFixed(2) || 'N/A'}
- Model BIC: ${rResult.model_diagnostics?.bic?.toFixed(2) || 'N/A'}

${rResult.disconfirmation_tests ? `## Disconfirmation Tests
- Overall: ${rResult.disconfirmation_tests.passed ? 'PASSED' : 'FAILED'}
- Tests passed: ${rResult.disconfirmation_tests.tests_passed}/${rResult.disconfirmation_tests.tests_total}
- Details: ${JSON.stringify(rResult.disconfirmation_tests.details)}` : ''}

## Question
${question}

## Requirements
1. State the effect size and confidence interval explicitly
2. Report the p-value with context (what alpha level, one/two-sided?)
3. State whether the finding survived disconfirmation testing
4. List at least 3 alternative explanations that could produce this result
5. State the limitations of this analysis (sample size, confounders, etc.)
6. Quantify uncertainty: how much would the conclusion change if key assumptions varied?
7. Recommend at least 2 follow-up analyses to strengthen or weaken this finding
8. DO NOT state conclusions without acknowledging uncertainty
9. DO NOT use deterministic language ("proves", "definitively shows") - use probabilistic language
10. State what would FALSIFY this finding
`;
  }
  
  /**
   * Generate a "regression table" prompt
   */
  generateRegressionTablePrompt(
    independentVariable: string,
    outcomeVariable: string,
    controlVariables: string[],
    context: AnalysisContext
  ): string {
    return `
Provide a regression analysis showing the effect of ${independentVariable}
on ${outcomeVariable}, controlling for: ${controlVariables.join(', ')}.

Required output:
1. Full regression table with:
   - Coefficients (standardized and unstandardized)
   - Standard errors
   - z-values / t-values
   - P-values
   - 95% confidence intervals
   - Effect sizes (Cohen's d or odds ratios)

2. Model fit statistics:
   - AIC, BIC, Log-Likelihood
   - Pseudo R-squared (for logistic models)
   - Concordance index (for survival models)

3. Assumption checks:
   - Multicollinearity (VIF values)
   - Heteroscedasticity
   - Linearity (where applicable)
   - Proportional odds (for ordinal outcomes)

4. Robustness checks:
   - Results with different functional forms
   - Results excluding outliers
   - Results with different control sets

5. Limitations paragraph:
   - What confounders are NOT controlled?
   - How does missing data affect interpretation?
   - Sample size adequacy
   - Generalizability concerns

Context: ${JSON.stringify(context)}
`;
  }
  
  /**
   * Generate a sensitivity analysis prompt
   */
  generateSensitivityPrompt(
    baseAnalysis: string,
    context: AnalysisContext
  ): string {
    return `
Perform sensitivity analysis for the following base analysis:

${baseAnalysis}

Required sensitivity checks:
1. **Vary the controls**: 
   - Remove each control variable one at a time
   - Add additional controls not in base model
   - Report how the coefficient changes

2. **Vary the model specification**:
   - OLS vs. GLM
   - With/without interaction terms
   - With/without regional fixed effects

3. **Vary the sample**:
   - Exclude small groups (n < 30 per category)
   - Exclude outliers (beyond 1.5 IQR)
   - Subsample by time period

4. **Placebo tests**:
   - Test outcome on null period
   - Test with outcome not expected to show disparity
   - Random permutation test

5. **Alternative explanations**:
   - Confounding by offense severity mix
   - Differences in legal representation
   - Policy changes over time
   - Judge/venue assignment effects

For each check, report:
- New effect size
- New p-value
- Whether conclusion changes
- Interpretation

Context: ${JSON.stringify(context)}
`;
  }
  
  /**
   * Generate a "what would falsify this" prompt
   */
  generateFalsificationPrompt(
    finding: string,
    context: AnalysisContext
  ): string {
    return `
What would FALSIFY the following finding?

Finding: ${finding}

Generate:
1. **Alternative hypotheses** that would produce similar observed data
2. **Specific conditions** under which the finding would be wrong
3. **Threshold values**: How much would the effect size need to change
   for the conclusion to no longer be reliable?
4. **Data quality issues** that could create an apparent effect
5. **Publication bias** in the underlying court data
6. **Selection bias** in which cases are recorded vs. not recorded

For each falsification pathway, estimate:
- Probability it's the real explanation (0-1)
- How to test whether it applies to this data
- What the data would look like if it were the explanation

Context: ${JSON.stringify(context)}
`;
  }
  
  /**
   * Generate a plain-language summary prompt
   */
  generatePlainLanguagePrompt(
    rResult: RAnalysisResult,
    context: AnalysisContext,
    targetAudience: 'public' | 'policy_maker' | 'legal_professional' | 'academic'
  ): string {
    const audienceGuidance = {
      public: "Write for the general public. Avoid jargon. Use analogies. Emphasize that correlation != causation.",
      policy_maker: "Write for policy makers. Focus on actionable insights, cost-benefit implications, and comparison to best practices.",
      legal_professional: "Write for legal professionals. Include case law considerations, procedural due process, and constitutional implications.",
      academic: "Write for academic researchers. Include full statistical detail, assumptions, and connections to published literature."
    };
    
    return `
${audienceGuidance[targetAudience]}

Convert the following statistical analysis into a clear summary for ${targetAudience}s.

## Statistical Results
- Effect size: ${rResult.effect_size.toFixed(4)}
- P-value: ${rResult.p_value.toFixed(4)}
- 95% CI: [${rResult.confidence_interval[0].toFixed(4)}, ${rResult.confidence_interval[1].toFixed(4)}]
- Sample size: ${context.caseCount} cases
- Data quality: ${context.dataQualityScore}%

## Key Requirements
1. State the finding in one sentence, with the effect size and CI
2. Explain what "statistically significant" means in this context
3. State at least 3 limitations of the analysis
4. Explain what this finding does NOT show (causation, etc.)
5. Use appropriate uncertainty language
6. Include a "what this means" section appropriate for the audience

DO NOT overstate the findings. Use phrases like "may indicate", "suggests",
"consistent with" rather than "proves" or "definitively shows".
`;
  }
  
  /**
   * Generate a multi-modal analysis prompt
   */
  generateMultimodalPrompt(
    questions: string[],
    context: AnalysisContext,
    rResults: RAnalysisResult[]
  ): string {
    const resultsBlock = rResults.map((r, i) => `
### Analysis ${i + 1}: ${r.analysis_type}
- Effect size: ${r.effect_size.toFixed(4)}
- P-value: ${r.p_value.toFixed(4)}
- CI: [${r.confidence_interval[0].toFixed(4)}, ${r.confidence_interval?.[1]?.toFixed(4) || 'N/A'}]
`).join('\n');
    
    return `
Provide a comprehensive analysis addressing these questions:

${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

## Statistical Results Available
${resultsBlock}

## Context
${JSON.stringify(context)}

## Output Format
Structure your response as:
1. Executive Summary (2-3 paragraphs)
2. Individual Answers to Each Question
3. Integrated Interpretation
4. Limitations and Caveats
5. Recommended Next Steps
`;
  }

  /**
   * Generate a confounder explanation prompt
   * Tests specific alternative hypotheses about what could cause the observed effect
   */
  generateConfounderPrompt(
    finding: string,
    observedEffect: number,
    availableConfounders: string[],
    unmeasuredConfounders: string[],
    context: AnalysisContext
  ): string {
    return `
You are reviewing a statistical finding for confounding bias.

## Observed Finding
${finding}

## Observed Effect Size: ${observedEffect}

## Available Confounders (Controlled in Model)
${availableConfounders.map(c => `- ${c}`).join('\n')}

## Unmeasured Confounders (Not Available)
${unmeasuredConfounders.map(c => `- ${c}`).join('\n')}

## Context
${JSON.stringify(context)}

## Task
For EACH unmeasured confounder:
1. Estimate the strength of association with BOTH:
   - The treatment/dispary (e.g., race) - scale 0-1
   - The outcome - scale 0-1
2. Use the E-value formula: E = OR + sqrt(OR*(OR-1)) to assess
3. Determine whether plausible confounding could explain away the effect
4. Recommend the most cost-effective control to collect

For each available confounder NOT in the model:
1. Should it be added?
2. Will it change the conclusion?
3. How to collect it?

Be specific about thresholds and magnitudes. Do not overstate uncertainty.
`;
  }

  /**
   * Generate an interpretation prompt
   * Helps interpret statistical results in context
   */
  generateInterpretationPrompt(
    analysisType: string,
    effectSize: number,
    pValue: number,
    confidenceInterval: [number, number],
    disconfirmationPassed: boolean,
    preRegisteredHypothesis: string,
    context: AnalysisContext
  ): string {
    return `
You are a statistical review panel interpreting the following analysis.

## Analysis Details
- Type: ${analysisType}
- Effect size: ${effectSize.toFixed(4)}
- P-value: ${pValue.toFixed(4)} (significance level: 0.05)
- 95% Confidence interval: [${confidenceInterval[0].toFixed(4)}, ${confidenceInterval[1].toFixed(4)}]
- Disconfirmation tests: ${disconfirmationPassed ? 'PASSED' : 'FAILED'}
- Pre-registered hypothesis: "${preRegisteredHypothesis}"

## Context
${JSON.stringify(context)}

## Task
Interpret this finding honestly. Address:

1. **Statistical significance**: Is p < 0.05? What does the p-value actually mean?
2. **Practical significance**: Is the effect size meaningful in substantive terms?
3. **Confidence interval interpretation**: What range of values is plausible?
4. **Direction**: Does the effect go where expected given the pre-registered hypothesis?
5. **Disconfirmation**: What does passing/failing falsification tests mean?
6. **Causality**: What causal claims are and are NOT justified?
7. **Overall conclusion**: One paragraph summary with appropriate hedging

Be balanced. Highlight both supporting and contradicting evidence equally.
`;
  }

  /**
   * Generate a pre-registration guidance prompt
   * Helps users design pre-registration before data collection/examination
   */
  generatePreRegistrationPrompt(
    researchTopic: string,
    researchQuestion: string,
    dataAvailable: boolean,
    outcomeType: 'binary' | 'continuous' | 'count' | 'time-to-event'
  ): string {
    const outcomeGuidance = {
      binary: "Use logistic regression (glm, family=binomial). Report odds ratio with 95% CI.",
      continuous: "Use OLS linear regression (lm). Check normality of residuals; transform if needed. Report beta coefficient with 95% CI.",
      count: "Use Poisson or negative binomial regression. Report rate ratio with 95% CI.",
      'time-to-event': "Use survival analysis (survival::survreg). Report hazard ratio with 95% CI."
    };

    return `
You are a statistical methods expert helping design a pre-registration.
The goal is to create a rigorous, falsifiable analysis plan BEFORE examining data.

## Research Topic
${researchTopic}

## Research Question
${researchQuestion}

## Data Status
${dataAvailable ? 'Data is available for analysis.' : 'Data is not yet collected. Focus on measurement design.'}

## Outcome Type: ${outcomeType}
Relevant statistical method: ${outcomeGuidance[outcomeType]}

## Task: Generate a complete pre-registration document including:

### 1. Research Question
Restate the question clearly and specifically. Make it falsifiable.

### 2. Hypothesis
- Clear, directional statement (specify expected direction)
- Null hypothesis
- Alpha level (default 0.05)
- One-sided or two-sided test

### 3. Sample/Inclusion Criteria
- Who is included?
- Who is excluded?
- Minimum sample size requirement per group

### 4. Variables
- Primary predictor (treatment): name, coding, reference group
- Primary outcome: definition, units, transformation plan
- Control variables: list and justification for each

### 5. Statistical Analysis Plan
- Exact model formula
- Estimation method
- Robust standard errors: yes/no and why
- Significance threshold

### 6. Disconfirmation Tests
- One placebo test (outcome that should NOT show the effect)
- One negative control (measure that should be unrelated)
- Specification sensitivity list (3-5 alternative model specifications)
- At least one alternative explanation to test

### 7. Effect Size & Power
- Primary effect size metric
- Minimum detectable effect
- Sample size calculation

### 8. Planned Deviations
- How to document any deviations from this plan

Format as a clean, professional document with clear section headers.
`;
  }

  /**
   * Generate an audit prompt
   * Full methodological audit of an analysis
   */
  generateAuditPrompt(
    analysisDescription: string,
    code: string,
    dataQualityInfo: {
      caseCount: number;
      missingDemographicsRate: number;
      dataQualityScore: number;
      missingControlRates: { [key: string]: number };
    }
  ): string {
    return `
You are a rigorous statistical auditor reviewing an analysis of legal justice data.
Find methodological weaknesses, potential biases, and reporting issues.

## Analysis Description
${analysisDescription}

## Analysis Code
\`\`\`
${code}
\`\`\`

## Data Quality
- Case count: ${dataQualityInfo.caseCount}
- Missing demographics rate: ${(dataQualityInfo.missingDemographicsRate * 100).toFixed(1)}%
- Data quality score: ${dataQualityInfo.dataQualityScore}/100
- Missing control rates: ${JSON.stringify(dataQualityInfo.missingControlRates)}

## Audit Checklist
For each of the following, identify any issues found:

### 1. Hypothesis & Pre-Registration
- Was the hypothesis stated before examining data?
- Is it directional and falsifiable?

### 2. Sample Definition
- Inclusion/exclusion criteria clear and appropriate?
- Any selection bias from exclusions?
- Minimum sample size per group?

### 3. Variable Definitions
- Outcome measured correctly?
- Predictor coded correctly?
- Controls appropriate for confounding?

### 4. Statistical Methods
- Model appropriate for outcome type?
- Robust standard errors used?
- Assumption checks performed?

### 5. Robustness
- Specification sensitivity done?
- Placebo/negative control tests done?
- Disconfirmation tests done?

### 6. Reporting
- Effect sizes with CI reported?
- P-values with direction and alpha specified?
- Limitations honestly discussed?
- Uncertainty quantified?
- Disconfirmation results included?

### 7. Potential Confounding
- Key confounders measured?
- Unmeasured confounding addressed?
- Alternative explanations considered?

### 8. Data Quality
- Missing data handled appropriately?
- Outliers handled transparently?
- Multiple testing addressed?

Report issues ranked: critical, major, minor. Include specific fix recommendations.
`;
  }

  /**
   * Generate a comparison prompt
   * Compares results across jurisdictions, time periods, or groups
   */
  generateComparisonPrompt(
    comparisonType: string,
    rResults: RAnalysisResult[],
    context: AnalysisContext
  ): string {
    const resultsBlock = rResults.map((r, i) => `
### Comparison Unit ${i + 1}: ${r.analysis_type}
- Effect size: ${r.effect_size.toFixed(4)}
- P-value: ${r.p_value.toFixed(4)}
- CI: [${r.confidence_interval[0].toFixed(4)}, ${r.confidence_interval[1]?.toFixed(4) || 'N/A'}]
${r.disconfirmation_tests ? `- Disconfirmation: ${r.disconfirmation_tests.passed ? 'PASSED' : (r.disconfirmation_tests.tests_passed === r.disconfirmation_tests.tests_total ? 'ALL PASSED' : 'FAILED')}` : '- Disconfirmation: not run'}
`).join('\n');

    return `
You are comparing statistical results across ${comparisonType}.
Identify patterns, heterogeneity, and consistency.

## Comparison Results
${resultsBlock}

## Context
${JSON.stringify(context)}

## Task
1. Describe the overall pattern across comparison units
2. Identify where results are consistent vs. divergent
3. For divergent results, suggest plausible reasons
4. Assess whether the evidence is homogeneous or heterogeneous
5. Provide an integrated summary conclusion

Use forest plot language: "The effect ranged from X to Y across units, with most points above zero."
`;
  }
}