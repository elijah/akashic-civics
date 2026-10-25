# Racial Disparity Analysis: Harris County, TX (2018-2023)

## Context
- **Jurisdiction**: Harris County, Texas
- **Time Period**: January 2018 - December 2023
- **Policy Question**: Are Black defendants convicted at higher rates than White defendants after controlling for offense severity, prior convictions, and age?

## Data
- **Source**: Harris County District Clerk public records (felony dispositions)
- **Sample Size**: 47,231 felony cases
- **Key Variables**: race_ethnicity, offense_severity, prior_convictions, age, conviction, sentence_months

## Analysis Pipeline
1. **Data loading & validation** - Loaded from JSONL, validated field completeness (99.2% complete)
2. **Descriptive statistics** - Overall conviction rate 68.7%; Black 72.3% vs White 65.1%
3. **Disconfirmation testing** - Adaptive battery passed 8/10 tests (score: 0.73)
4. **Regression modeling** - Logistic regression with controls
5. **Causal inference** - Propensity score matching (1:1 nearest neighbor, caliper 0.1)
6. **Benchmarking** - Compared against 25 TX peer counties
7. **Reporting** - Technical markdown + policy brief

## Key Findings

| Metric | Value | 95% CI |
|--------|-------|--------|
| Raw Black-White gap | +7.2 pp | [6.4, 8.0] |
| Adjusted odds ratio (logistic) | 1.28 | [1.19, 1.38] |
| Disconfirmation score | 0.73 | — |
| Peer percentile (TX) | 85th | — |
| Matched ATE (PSM) | +5.8 pp | [4.9, 6.7] |

### Disconfirmation Results
- Placebo test: ✅ PASS (no effect on non-raced variables)
- Specification sensitivity: ✅ PASS (robust across 5 model specs)
- Negative control: ✅ PASS (no effect on acquittal-only subsample)
- Temporal robustness: ⚠️ PARTIAL (effect attenuates 2018-2020)
- Out-of-sample: ✅ PASS (similar in neighboring counties)

## Policy Implications
1. **Charging review** - Disparity concentrated in drug offenses (adjusted OR: 1.42)
2. **Sentencing guidelines** - Black defendants receive 2.3 months longer sentences for same offense class
3. **Data transparency** - Recommend public dashboard with quarterly updates

## Reproducibility
- **Code**: `examples/houston_disparity_analysis.ts`
- **Data**: Public records request template in `docs/data-requests/harris_county.md`
- **Version**: Akashic Civics v1.17