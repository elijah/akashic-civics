# End-to-End Testing Workflow

This document describes the complete end-to-end testing procedure for the Akashic Justice Analysis System.

## Overview

The end-to-end test verifies that all components work together correctly:

1. Data ingestion with provenance tracking
2. Historical baseline creation
3. Pre-registration creation and validation
4. R analysis execution
5. Disconfirmation testing
6. Result comparison and reporting

## Prerequisites

### Required Software

- **R** (4.0+) with packages:
  - `survival`, `mice`, `survey`, `car`, `lmtest`, `sandwich`, `broom`, `dplyr`, `ggplot2`
- **Node.js** (16+) with packages:
  - `crypto` (built-in)
  - `fs` (built-in)

### Install R Packages

```r
install.packages(c(
  "dplyr", "tidyr", "purrr", "stringr", "forcats",
  "lme4", "sandwich", "lmtest", "survey", "mice",
  "car", "ggplot2", "broom", "haven", "readr", "jsonlite",
  "survival", "digest"
))
```

## Test Procedure

### Step 1: Generate Simulated Data

```bash
# Run the example analysis to generate test data
cd docs/analysis-templates
Rscript example_analysis.R
```

This creates `simulated_akashic_cases.rds` and `simulated_akashic_cases.csv` with known disparities.

### Step 2: Create Pre-Registration

```bash
# Create a pre-registration BEFORE looking at data
node scripts/pre-register/pre_register.js create \
  --question="Racial disparity in conviction rates in test jurisdiction" \
  --hypothesis="Black defendants have higher conviction rates than white defendants, controlling for offense severity and case characteristics" \
  --outcome=conviction \
  --predictor=race_ethnicity \
  --controls=offense_severity,charge_type,age_at_arrest \
  --alpha=0.05 \
  --output=test_pre_registration.json
```

### Step 3: Validate Pre-Registration

```bash
node scripts/pre-register/pre_register.js validate --file=test_pre_registration.json
```

### Step 4: Run Analysis with Disconfirmation Testing

```r
# In R
source("docs/analysis-templates/akashicjustice.R")
source("docs/analysis-templates/disconfirmation.R")
source("docs/analysis-templates/pre_registration.R")

# Load data
cases <- readRDS("simulated_akashic_cases.rds")

# Load pre-registration
reg <- load_pre_registration("test_pre_registration.json")

# Run full pre-registered analysis
results <- pre_registered_analysis(
  data = cases,
  registration = reg,
  analysis_function = disparate_impact_conviction,
  output_dir = "test_results"
)
```

### Step 5: Compare Pre-Registered vs Observed

```bash
# After analysis, compare results
node scripts/pre-register/pre_register.js compare \
  --file=test_pre_registration.json \
  --effect=1.42 \
  --p=0.032 \
  --conclusion="reject null"
```

### Step 6: Generate Final Report

```r
# Generate comprehensive report
report <- generate_pre_registration_report(reg)
writeLines(report, "final_analysis_report.md")
```

### Step 7: Verify Outputs

Check that all expected files exist:

```
test_results/
├── pre_registered_analysis_TIMESTAMP.rds
├── pre_registered_analysis_TIMESTAMP.md
├── pre_registration.rds
└── disconfirmation_details.rds
```

## Expected Results

### Data Quality
- Average completeness score ≥ 80
- No cases with >50% missing core fields
- All demographic categories represented

### Analysis Results
- Effect size (OR) > 1.0 (indicating disparity)
- P-value < 0.05 (significant)
- Confidence interval excludes 1.0

### Disconfirmation Tests
- Placebo tests: PASS (no false positives)
- Specification sensitivity: PASS (robust to model changes)
- Negative controls: PASS (no systemic bias)
- Out-of-sample validation: PASS (replicates in holdout)
- Temporal robustness: PASS (consistent over time)
- Alternative explanations: PASS (no confounders)

## Troubleshooting

### Issue: R packages not found

**Solution:**
```r
install.packages(c("survival", "mice", "survey", "car", "lmtest", "sandwich", "broom", "dplyr", "ggplot2"))
```

### Issue: Pre-registration validation fails

**Solution:**
Check that all required fields are present:
- research_question
- hypothesis (with statement, directional, alpha)
- outcome_variable (with name, definition, type)
- predictor_variable (with name, levels, reference_level)
- control_variables (with controls, inclusion_criteria)
- analysis_plan (with method, model_formula, software, packages)
- significance_threshold (with alpha, two.sided, adjustment_method)

### Issue: Disconfirmation tests fail

**Solution:**
- Check for false positive bias (placebo tests)
- Verify model specifications are valid
- Ensure negative controls are truly unrelated
- Check for data quality issues
- Verify temporal stability

## Success Criteria

The end-to-end test is successful if:

1. ✅ All components execute without errors
2. ✅ Pre-registration is created and validated
3. ✅ Analysis produces expected effect sizes
4. ✅ All 6 disconfirmation tests pass
5. ✅ Final report is generated with all required sections
6. ✅ Output files are saved with timestamps and hashes
7. ✅ Comparison between pre-registered and observed results is documented
