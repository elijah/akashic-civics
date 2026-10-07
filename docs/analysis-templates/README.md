# Akashic Justice Analysis Templates

This directory contains comprehensive R-based statistical analysis templates for conducting rigorous, falsifiable analysis of normalized legal/justice data from the Akashic system.

## Available Templates

| Template | Purpose | Primary Use Case |
|----------|---------|------------------|
| `disparate_impact.Rmd` | Conviction rate disparities | Examining whether certain demographic groups are more likely to be convicted |
| `sentencing_disparity.Rmd` | Sentence length disparities | Examining whether convicted defendants receive different sentences |
| `time_to_disposition.Rmd` | Case processing time disparities | Examining whether case duration differs across groups |
| `e_value_sensitivity.Rmd` | Sensitivity to unmeasured confounding | Quantifying robustness to hidden bias |
| `alternative_explanations.Rmd` | Systematic alternative explanation testing | Testing specific alternative hypotheses |

## Common Structure

All templates follow the same rigorous framework:

### 1. Pre-Registration (Mandatory)
- Research question clearly stated before data examination
- Directional hypothesis with alpha level
- Outcome, predictor, and control variables specified
- Inclusion/exclusion criteria defined
- Analysis plan with model formula and estimation method
- Significance threshold defined

### 2. Primary Analysis
- Statistical model appropriate to outcome type
- Robust standard errors to account for heteroscedasticity
- Effect size calculation with confidence intervals
- Proper p-value reporting

### 3. Disconfirmation Testing (6 Tests)
Each template includes all 6 falsification tests:
1. **Placebo tests** - Check for false positives on known-null outcomes
2. **Specification sensitivity** - Robustness to model specification changes
3. **Negative controls** - Ensure no systemic methodology bias
4. **Out-of-sample validation** - Test generalizability to holdout samples
5. **Temporal robustness** - Check stability across time periods
6. **Alternative explanation testing** - Test specific confounding hypotheses

### 4. Reporting
- Comparison of pre-registered vs. observed results
- Documentation of any deviations
- Complete limitations and caveats section
- Reproducibility information (data hash, code version)

## Quick Start

```r
# Load all core Akashic functions
source("akashicjustice.R")
source("disconfirmation.R")
source("pre_registration.R")

# Choose your template
source("disparate_impact.Rmd")  # or sentencing_disparity.Rmd, etc.

# Create template instance
template <- create_disparate_impact_template(
  jurisdiction = "Your Jurisdiction Name",
  groups_of_interest = c("Black", "Hispanic"),
  reference_group = "White"
)

# Create pre-registration (DO THIS BEFORE LOOKING AT DATA)
template <- set_pre_registration(template, data = your_data)

# Run analysis
results <- run_analysis(template, data = your_data, output_dir = "results")

# The report will be generated in results/report.md
```

## Required Packages

All templates require these core packages:
```r
install.packages(c(
  "dplyr", "tidyr", "purrr", "stringr", "forcats",
  "lme4", "sandwich", "lmtest", "survey", "mice",
  "car", "ggplot2", "broom", "haven", "readr", "jsonlite",
  "survival", "digest", "EValue", "survminer"
))
```

## Template Selection Guide

| Question | Best Template |
|----------|---------------|
| Are certain groups more likely to be convicted? | `disparate_impact.Rmd` |
| Do convicted groups receive different sentences? | `sentencing_disparity.Rmd` |
| Do cases take longer to process for some groups? | `time_to_disposition.Rmd` |
| How robust is my finding to unmeasured confounders? | `e_value_sensitivity.Rmd` |
| What specific alternative explanations could explain my result? | `alternative_explanations.Rmd` |
| Multiple questions or exploratory analysis | Use `akashicjustice.R` functions directly |

## Workflow Integration

These templates are designed to work with the Akashic pipeline:

```bash
# Export data from Akashic pipeline
npm run export-legal-data -- --format=json --output=jurisdiction_cases.json

# In R:
cases <- import_akashic_cases("jurisdiction_cases.json")
template <- create_disparate_impact_template(jurisdiction = "County XYZ")
results <- run_analysis(template, data = cases, output_dir = "analysis_results")
```

## Output Structure

Each analysis generates:
```
results/
├── pre_registration.rds       # Pre-registration file (timestamped)
├── report.md                    # Human-readable analysis report
├── primary_analysis.rds         # Full model results
├── disconfirmation_tests.rds    # All 6 falsification test results
├── diagnostic_plots/            # Any diagnostic plots generated
└── summary.json                 # Key metrics for dashboards
```

## Citation

If you use these templates, please cite:

> Akashic Justice Analysis Templates. Pre-registration & Disconfirmation Testing Framework for Legal Bias Analysis. Version 1.0. Akashic Civics Project.

## License

MIT License — See LICENSE file in repository root.