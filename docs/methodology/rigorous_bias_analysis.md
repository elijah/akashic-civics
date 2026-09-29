# Rigorous Bias Analysis Methodology

## Overview

This document specifies the complete methodological framework for detecting legal bias using the Akashic Justice Analysis System. It is designed to produce evidence that withstands peer review, replication attempts, and adversarial challenges.

## Core Principles

### 1. Falsifiability (Primary Principle)

Every hypothesis must be formulated in a way that it CAN BE DISPROVEN. A finding that cannot be falsified is not science.

**Implementation:**
- Pre-register the hypothesis with explicit conditions for rejection
- Run disconfirmation tests that actively try to disprove the finding
- Report negative results alongside positive results

### 2. Pre-Registration

The analysis plan must be specified BEFORE examining the data. This prevents HARKing and p-hacking.

**What to pre-register:**
- Research question and directional hypothesis
- Outcome variable and its operational definition
- Primary predictor variable and reference group
- All control variables with rationale for inclusion/exclusion
- Analysis method (logistic regression, OLS, etc.)
- Model formula
- Significance threshold (α = 0.05 default)
- Sample inclusion/exclusion criteria
- Missing data handling approach

### 3. Reproducibility

Every analysis must be fully reproducible from raw data to final result.

**Implementation:**
- Version-controlled analytical code
- Data lineage tracking (provenance)
- Timestamped snapshots
- Complete dependency specification
- Automated documentation generation

### 4. Statistical Rigor

All statistical methods must be appropriate for the data structure and research question.

**Requirements:**
- Effect sizes with confidence intervals (not just p-values)
- Proper handling of multiple comparisons
- Sensitivity analysis for unmeasured confounding
- Assumption checking (linearity, homoscedasticity, independence)
- Robust standard errors where appropriate

### 5. Humility

Explicit statement of what the system cannot determine.

**Limitations:**
- Observational data cannot establish causation
- Unmeasured confounding may still exist
- Small sample sizes reduce power
- Data quality affects validity
- Temporal stability must be verified

## Analysis Protocol

### Phase 1: Data Preparation

```
1. Import raw data from source
2. Apply normalization schema (legal_justice_schema.md)
3. Compute data quality scores
4. Track provenance for every case
5. Create historical baseline snapshot
6. Document all transformations
```

### Phase 2: Pre-Registration

```
1. Specify research question
2. Define hypothesis (directional)
3. Identify outcome, predictor, controls
4. Choose analysis method
5. Set significance threshold
6. Save pre-registration (immutable)
7. Verify no data examination has occurred
```

### Phase 3: Primary Analysis

```
1. Verify data meets pre-registered criteria
2. Run primary analysis (e.g., logistic regression)
3. Record effect size, confidence interval, p-value
4. Generate methodology documentation
```

### Phase 4: Disconfirmation Testing

```
ALL SIX tests must pass:

1. PLACEBO TESTS
   - Apply methodology to known-null periods
   - PASS: No significant effects (p >= 0.05)
   - FAIL: False positive bias detected → ALL findings unreliable

2. SPECIFICATION SENSITIVITY
   - Vary model specifications
   - PASS: ≥80% of specs show consistent direction/significance
   - FAIL: Effect is fragile → Report range, not point estimate

3. NEGATIVE CONTROLS
   - Apply methodology to unrelated outcomes
   - PASS: Main effect significant; negatives NOT significant
   - FAIL: Systemic methodology bias detected

4. OUT-OF-SAMPLE VALIDATION
   - Split data 70/30, train/test
   - PASS: Effect replicates in holdout (within 20%)
   - FAIL: Overfitting → Effect may not generalize

5. TEMPORAL ROBUSTNESS
   - Split data into 4 time periods
   - PASS: Consistent direction across periods
   - FAIL: Period-specific artifact → Investigate

6. ALTERNATIVE EXPLANATION TESTING
   - Test complexity, pre-court screening, plea, geography, trends, judges
   - PASS: NO alternative explanation supported
   - FAIL: Effect may be due to confounding factor
```

### Phase 5: Comparison & Reporting

```
1. Compare pre-registered vs. observed results
2. Flag any deviations
3. Generate comprehensive report
4. Save all outputs for replication
```

## Evidentiary Thresholds

### Credible Evidence of Bias Requires ALL of:

- [ ] Pre-registered before data examination
- [ ] All verification checks pass
- [ ] Survives ALL 6 disconfirmation tests
- [ ] Effect size consistent with hypothesis
- [ ] No major deviations flagged
- [ ] Sensitivity analysis shows robustness
- [ ] Limitations clearly stated

### Not Credible (REJECT):

- Effect disappears in any disconfirmation test
- Pre-registration not done
- Major deviations between pre-registered and actual analysis
- Alternative explanations supported by data
- Out-of-sample validation fails

## Statistical Methods

### Primary Analysis Methods

| Question | Method | Package |
|----------|--------|---------|
| Conviction disparity | Logistic regression | survival |
| Sentencing disparity | Linear regression on log sentence | survival |
| Time-to-disposition | Cox proportional hazards | survival |
| Missing data | Multiple imputation | mice |
| Survey data | Weighted analysis | survey |
| Model diagnostics | VIF, influence measures | car, lmtest |

### Effect Size Interpretation

| Metric | Small | Medium | Large |
|--------|-------|--------|-------|
| Odds Ratio | 1.2-1.5 | 1.5-2.5 | >2.5 |
| Percent Difference | 5-10% | 10-20% | >20% |
| Cohen's d | 0.2 | 0.5 | 0.8 |

### Confidence Intervals

- Report 95% confidence intervals for all effect sizes
- If CI includes 1 (for OR) or 0 (for difference), effect not significant
- If CI is very wide, estimate imprecise → More data needed

## Common Pitfalls to Avoid

### 1. HARKing (Hypothesizing After Results Known)

**Bad:** Look at data, find interesting pattern, formulate hypothesis

**Good:** Specify hypothesis BEFORE examining data

### 2. P-Hacking

**Bad:** Try multiple specifications until p < 0.05

**Good:** Pre-specify ONE analysis plan, test robustness

### 3. Cherry-Picking

**Bad:** Report only significant subgroups

**Good:** Report all subgroups, correct for multiplicity

### 4. Ignoring Confounding

**Bad:** Compare raw rates without controls

**Good:** Control for severity, charge type, age, priors, etc.

### 5. False Precision

**Bad:** Report p = 0.048 as "significant" but p = 0.052 as "not significant"

**Good:** Report effect sizes and CIs, interpret continuously

### 6. Neglecting Out-of-Sample Validation

**Bad:** Report effect only in training data

**Good:** Validate in holdout data, report replication

## Quality Assurance

### Data Quality Checks

- Completeness score ≥ 70% for core fields
- Logical date sequence (arrest ≤ charge ≤ disposition)
- Demographic plausibility (age 15-90 for adult cases)
- No impossible combinations (felony with 0 sentence)
- Source reliability assessment

### Analysis Quality Checks

- Sample size ≥ 30 per group
- No separation in logistic regression
- VIF < 10 for multicollinearity
- PH assumption met for Cox model
- Residuals checked for OLS

## Reporting Template

```markdown
# Analysis Report

## Research Question
[Racial disparity in conviction rates...]

## Hypothesis
[Black defendants have higher conviction rates...]

## Data
- N cases: [number]
- N groups: [number]
- Data quality score: [score]

## Pre-Registration
[Link to pre-registration file]

## Primary Results
- Effect size: [OR with CI]
- P-value: [value]
- Conclusion: [reject/fail to reject]

## Disconfirmation Tests
- Placebo tests: [PASS/FAIL]
- Specification sensitivity: [PASS/FAIL]
- Negative controls: [PASS/FAIL]
- Out-of-sample validation: [PASS/FAIL]
- Temporal robustness: [PASS/FAIL]
- Alternative explanations: [PASS/FAIL]

## Limitations
[Explicit statement of limitations]

## Conclusion
[Cautious interpretation]
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial methodology framework |
| 1.1.0 | 2024-06-15 | Added disconfirmation testing protocol |
| 1.2.0 | 2024-09-01 | Added pre-registration system |
| 1.3.0 | 2024-09-29 | Added provenance tracking, historical baselines |

## References

- Nosek, B. A., et al. (2018). "Promoting an open research culture." Science.
- Lakens, D. (2022). "Equivalence tests: A practical primer for t tests, correlations, and meta-analyses." Social Psychological and Personality Science.
- Vandenbroucke, J. P., et al. (2014). "Strengthening the Reporting of Observational Studies in Epidemiology (STROBE)."
