# Akashic Justice Analysis Templates

This directory contains the complete R-based statistical analysis framework for conducting rigorous, falsifiable analysis of normalized legal/justice data from the Akashic system.

## Files

| File | Purpose |
|------|---------|
| `akashicjustice.R` | Core R package: data import, disparate impact, sentencing disparity, survival analysis, multiple imputation, E-value sensitivity, methodology reports |
| `disconfirmation.R` | **NEW**: Complete 6-test falsification framework (placebo tests, specification sensitivity, negative controls, out-of-sample validation, temporal robustness, alternative explanation testing) |
| `pre_registration.R` | **NEW**: Pre-registration system with verification, deviation detection, comparison, and full workflow orchestration |
| `example_analysis.R` | End-to-end example using simulated data |

## Quick Start

```r
# 1. Load all three core files
source("docs/analysis-templates/akashicjustice.R")
source("docs/analysis-templates/disconfirmation.R")
source("docs/analysis-templates/pre_registration.R")

# 2. Import data (from Akashic export or simulated)
cases <- import_akashic_cases("path/to/cases.json")

# 3. Pre-register your analysis BEFORE examining data
reg <- pre_registration_template()
reg$research_question <- "Whether Black defendants in Putnam County, TN have higher conviction rates..."
reg$hypothesis$statement <- "Black defendants have higher conviction rates than white defendants, controlling for offense severity, charge type, and age at arrest"
reg$outcome_variable$name <- "conviction"
reg$predictor_variable$name <- "race_ethnicity"
reg$analysis_plan$model_formula <- "conviction ~ race_ethnicity + offense_severity + charge_type + age_at_arrest"
save_pre_registration(reg, "my_pre_registration.rds")

# 4. Run full pre-registered analysis with disconfirmation testing
results <- pre_registered_analysis(
  data = cases,
  registration = reg,
  analysis_function = disparate_impact_conviction,
  output_dir = "results"
)

# 5. Generate final report
report <- generate_pre_registration_report(reg)
writeLines(report, "final_report.md")
```

## Complete Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRE-REGISTRATION (Before Data)                   │
├─────────────────────────────────────────────────────────────────────┤
│  1. Define research question & directional hypothesis              │
│  2. Specify outcome, predictor, control variables                  │
│  3. Define analysis method, model formula, significance threshold  │
│  4. Set inclusion/exclusion criteria                               │
│  5. Save pre-registration (timestamped, immutable)                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ANALYSIS EXECUTION                               │
├─────────────────────────────────────────────────────────────────────┤
│  1. Verify data meets pre-registered criteria                      │
│  2. Verify analysis plan matches pre-registration                  │
│  3. Run primary analysis                                           │
│  4. Record observed effect size, p-value, conclusion               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 DISCONFIRMATION TESTING (6 Tests)                   │
├─────────────────────────────────────────────────────────────────────┤
│  1. Placebo Tests          → Methodology doesn't detect false +    │
│  2. Specification Sens.    → Effect robust to model choices        │
│  3. Negative Controls      → No systemic methodology bias          │
│  4. Out-of-Sample Val.     → Effect generalizes beyond training    │
│  5. Temporal Robustness    → Effect stable over time periods       │
│  6. Alt. Explanation Test  → Rule out confounders (complexity,     │
│                             pre-court screening, plea, geography,   │
│                             temporal trends, judge assignment)      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPARISON & REPORTING                           │
├─────────────────────────────────────────────────────────────────────┤
│  1. Compare pre-registered vs. observed results                    │
│  2. Flag any deviations                                            │
│  3. Generate comprehensive markdown report                         │
│  4. Save all results for replication                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Evidentiary Standards

A finding is **credible** only if it passes ALL criteria:

| Test | Pass Criteria |
|------|---------------|
| Placebo | No significant effect (p ≥ 0.05) in known-null period |
| Specification Sensitivity | ≥80% of alternative specs show consistent direction & significance |
| Negative Controls | Main effect significant; negative controls NOT significant |
| Out-of-Sample | Effect direction & magnitude consistent (within 20%) in holdout |
| Temporal Robustness | Consistent direction across periods; significant in ≥75% |
| Alternative Explanations | NO alternative explanation supported by data |

## Pre-Registration Template Structure

```r
pre_registration_template()
```

Returns a list with:

- **research_question**: Clear statement of inquiry
- **hypothesis**: `{statement, directional, alpha}`
- **outcome_variable**: `{name, definition, type}`
- **predictor_variable**: `{name, levels, reference_level, coding}`
- **control_variables**: Named list of controls with `{description, type, included}` + `inclusion_criteria`
- **analysis_plan**: `{method, model_formula, software, packages, estimation_method, robust_errors}`
- **significance_threshold**: `{alpha, two.sided, adjustment_for_multiplicity, adjustment_method}`
- **pre_registration_metadata**: `{created, author, purpose}` (auto-filled)
- **pre_registered_effect_size/p_value/conclusion**: Filled AFTER analysis
- **discrepancy_notes**: Document any deviations

## Key Functions

### Pre-Registration Management
- `save_pre_registration(registration, filepath)` — Save to RDS
- `load_pre_registration(filepath)` — Load from RDS
- `compare_pre_post(registration, observed_effect, observed_p, observed_conclusion)` — Compare pre/post
- `generate_pre_registration_report(registration)` — Generate markdown report

### Verification
- `verify_data_processing(data, registration)` — Check inclusion criteria
- `verify_analysis_plan(analysis_spec, registration, verbose)` — Check analysis matches pre-reg
- `verify_analysis(results, registration)` — Check output matches plan

### Full Workflow
- `pre_registered_analysis(data, registration, analysis_function, output_dir, verbose)` — Complete pipeline

### Disconfirmation Testing
- `run_full_disconfirmation(data, analysis_function, analysis_spec, placebo_specs, alternative_specs, negative_controls, time_var)` — Run all 6 tests

## Required R Packages

```r
install.packages(c(
  "dplyr", "tidyr", "purrr", "stringr", "forcats",
  "lme4", "sandwich", "lmtest", "survey", "mice",
  "car", "ggplot2", "broom", "haven", "readr", "jsonlite",
  "survival", "digest"
))
```

## Example: Full Pre-Registered Analysis

```r
# Load core functions
source("akashicjustice.R")
source("disconfirmation.R")
source("pre_registration.R")

# Create pre-registration
reg <- pre_registration_template()
reg$research_question <- "Racial disparity in conviction rates in Putnam County, TN"
reg$hypothesis <- list(
  statement = "Black defendants have higher conviction rates than white defendants, controlling for offense severity and case characteristics",
  directional = "one.sided",
  alpha = 0.05
)
reg$outcome_variable <- list(name = "conviction", definition = "Binary: 1 if convicted", type = "binary")
reg$predictor_variable <- list(
  name = "race_ethnicity",
  levels = c("White", "Black", "Hispanic", "Other"),
  reference_level = "White",
  coding = "factor"
)
reg$control_variables$controls <- list(
  offense_severity = list(description = "Severity of charged offense", type = "ordered factor", included = TRUE),
  charge_type = list(description = "Type of offense", type = "factor", included = TRUE),
  age_at_arrest = list(description = "Age at arrest", type = "continuous", included = TRUE)
)
reg$control_variables$inclusion_criteria <- list(
  n_required = 30,
  exclude_pending = TRUE,
  exclude_dismissed = TRUE
)
reg$analysis_plan <- list(
  method = "logistic regression",
  model_formula = "conviction ~ race_ethnicity + offense_severity + charge_type + age_at_arrest",
  software = "R version 4.x+",
  packages = c("dplyr", "broom", "sandwich", "lmtest"),
  robust_errors = TRUE
)
reg$significance_threshold <- list(alpha = 0.05, adjustment_method = "none")

# Save BEFORE looking at data
save_pre_registration(reg, "pre_reg_putnam.rds")

# Run full workflow
results <- pre_registered_analysis(
  data = cases,
  registration = "pre_reg_putnam.rds",
  analysis_function = disparate_impact_conviction,
  output_dir = "putnam_results"
)

# Report is auto-generated in putnam_results/
```

## Methodological Rigor

This framework enforces:

1. **Falsifiability** — Every finding must survive 6 falsification tests
2. **Pre-registration** — Hypothesis & analysis plan fixed before data examination
3. **Transparency** — All deviations documented; full comparison report generated
4. **Replicability** — Complete workflow outputs saved with timestamps & hashes
5. **Sensitivity Analysis** — E-values quantify robustness to unmeasured confounding
6. **Missing Data Handling** — Multiple imputation with pooled estimates
7. **Survival Analysis** — Cox models for time-to-disposition with PH assumption checks

## Output Files

After `pre_registered_analysis()`, you get:

```
output_dir/
├── pre_registered_analysis_YYYY-MM-DD_HH-MM-SS.rds    # Full results object
├── pre_registered_analysis_YYYY-MM-DD_HH-MM-SS.md     # Human-readable report
├── pre_registration.rds                                # Copy of pre-registration
└── disconfirmation_details.rds                         # Full disconfirmation results
```

## Integration with Akashic Pipeline

```bash
# Export normalized data from Akashic pipeline
npm run export-legal-data -- --output-format=json --file=putnam_cases.json

# In R:
cases <- import_akashic_cases("putnam_cases.json")
# ... run pre_registered_analysis()
```

## Citation

If you use this framework, please cite:

> Akashic Justice Analysis Framework. Pre-registration & Disconfirmation Testing System for Legal Bias Analysis. Version 1.0. Akashic Civics Project.

## License

MIT License — See LICENSE file in repository root.