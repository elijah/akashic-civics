# Akashic Justice Analysis System - User Guide

## Welcome

The Akashic Justice Analysis System provides a complete, rigorous framework for detecting legal bias in civic data while maintaining the highest methodological standards. This system enforces falsifiability, pre-registration, and comprehensive disconfirmation testing to ensure that findings are credible, reproducible, and transparent.

## System Requirements

### Hardware
- Any modern computer (8GB+ RAM recommended for large datasets)
- Node.js 16+ for JavaScript tools
- R 4.0+ for statistical analysis

### Software Dependencies

#### R Packages (install once)
```r
install.packages(c(
  "dplyr", "tidyr", "purrr", "stringr", "forcats",
  "lme4", "sandwich", "lmtest", "survey", "mice",
  "car", "ggplot2", "broom", "haven", "readr", "jsonlite",
  "survival", "digest"
))
```

#### Node.js Packages (built-in modules only)
The JavaScript tools use only Node.js built-in modules (`crypto`, `fs`, `path`), so no npm install is required.

## Quick Start (5-Minute Guide)

### 1. Export Data from Akashic Pipeline
```bash
# From the Akashic command line
npm run export-legal-data \
  -- --output-format=json \
  --file=cases.json \
  --jurisdiction=putnam-county-tn
```

### 2. Create Pre-Registration
```bash
# Create your analysis plan BEFORE examining data
node scripts/pre-register/pre_register.js create \
  --question="Are Black defendants more likely to be convicted than white defendants in Putnam County, TN?" \
  --hypothesis="Black defendants have higher conviction rates than white defendants, controlling for offense severity, charge type, and age at arrest" \
  --outcome=conviction \
  --predictor=race_ethnicity \
  --controls=offense_severity,charge_type,age_at_arrest \
  --alpha=0.05 \
  --output=my_pre_registration.json
```

### 3. Validate Pre-Registration
```bash
node scripts/pre-register/pre_register.js validate --file=my_pre_registration.json
# Should output: Valid: true
```

### 4. Run Full Analysis
```bash
# In R
source("docs/analysis-templates/akashicjustice.R")
source("docs/analysis-templates/disconfirmation.R")
source("docs/analysis-templates/pre_registration.R")

# Load your data
cases <- readRDS("cases.json")  # or import from Akashic pipeline

# Run the complete workflow
results <- pre_registered_analysis(
  data = cases,
  registration = "my_pre_registration.json",
  analysis_function = disparate_impact_conviction,
  output_dir = "my_results"
)
```

### 5. Review Results
Check the generated report in `my_results/final_analysis_report.md`

## Component Reference

### R Analysis Framework

#### `akashicjustice.R`
Core analysis functions:
- `import_akashic_cases(filepath)` - Load normalized JSON data
- `disparate_impact_conviction(cases, group_var, controls)` - Logistic regression for conviction disparities
- `sentencing_disparity(cases, group_var, controls)` - Sentence length analysis
- `time_to_disposition(cases, group_var, controls)` - Survival/Cox model
- `impute_missing_demographics(cases, m)` - Multiple imputation
- `evalue_sensitivity(or, ci_lower, ci_upper)` - E-value calculation
- `generate_methodology_report(results, title, author)` - Report generation

#### `disconfirmation.R`
Complete 6-test falsification framework:
- `run_full_disconfirmation()` - Run all 6 tests
- Placebo tests, specification sensitivity, negative controls
- Out-of-sample validation, temporal robustness, alternative explanation testing

#### `pre_registration.R`
Pre-registration system:
- `pre_registration_template()` - Create blank registration
- `save_pre_registration(reg, filepath)` - Save to file
- `load_pre_registration(filepath)` - Load from file
- `compare_pre_post(reg, observed_effect, observed_p, observed_conclusion)` - Compare results
- `generate_pre_registration_report(reg)` - Create markdown report
- `pre_registered_analysis(data, registration, analysis_function, output_dir)` - Full workflow

### JavaScript Tools

#### `scripts/pre-register/pre_register.js`
Command-line utility:
- `create` - Generate new pre-registration file
- `validate` - Validate pre-registration completeness
- `compare` - Compare pre-registered vs observed results

#### `src/provenance/provenance_tracker.js/ts`
Data lineage tracking:
- `ProvenanceTracker` class - Add entries, get quality reports, compute hashes
- Track source connectors, quality scores, transformation history
- Generate provenance exports for audit trails

#### `src/statistical/historical_baseline.js/ts`
Historical baselines:
- `HistoricalBaseline` class - Create snapshots, compare over time
- Detect change points in conviction rates
- Export snapshots for temporal robustness testing

### Documentation Files

| File | Purpose |
|------|---------|
| `docs/analysis-templates/README.md` | Quick-start guide for R templates |
| `docs/methodology/rigorous_bias_analysis.md` | Complete methodology document |
| `docs/data-dictionary/legal_justice_schema.md` | Complete field dictionary |
| `E2E_TEST_WORKFLOW.md` | End-to-end test procedure |
| `ANALYSIS_SYSTEM_SUMMARY.md` | System architecture overview |
| `PLAN_STATISTICAL_RIGOR.md` | Original implementation plan |

## User Workflows

### Workflow 1: Researcher (Academic Publication)

1. **Pre-registration** (before data access)
   - Create pre-registration with hypothesis
   - Submit to institutional review board
   - Register on OSF or similar platform

2. **Data Analysis** (after data access)
   - Export normalized data from Akashic pipeline
   - Run `pre_registered_analysis()` in R
   - All 6 disconfirmation tests run automatically

3. **Reporting** (after analysis)
   - Generate comprehensive markdown report
   - Include pre-registration link in paper
   - Report disconfirmation test results
   - Discuss limitations transparently

4. **Publication**
   - Submit to journal with methodology appendix
   - Include disconfirmation test results
   - Provide pre-registration for replication

### Workflow 2: Policy Analyst (Government/NGO)

1. **Quick Analysis**
   - Export relevant case data
   - Run focused analysis on specific question
   - Generate policy brief with effect sizes and CIs

2. **Rigorous Analysis** (if required)
   - Full pre-registration workflow
   - Complete disconfirmation testing
   - Quality assurance checks

3. **Reporting**
   - Policy-focused summary
   - Effect magnitudes with confidence intervals
   - Actionable recommendations with uncertainty quantification

### Workflow 3: Educator/Student

1. **Learning the Methods**
   - Start with `example_analysis.R` (simulated data)
   - Experiment with different specifications
   - Observe how disconfirmation tests respond

2. **Reproducibility Exercises**
   - Create pre-registration, then swap with peer
   - Run each other's analyses
   - Compare results and discuss deviations

3. **Methodology Course**
   - Use `docs/methodology/rigorous_bias_analysis.md` as textbook
   - Complete end-to-end test workflow
   - Design own studies within framework

## Customization Guide

### Adapting to Your Data

#### Changing the Outcome Variable
If your data uses a different binary outcome:

```r
# Update pre-registration
reg$outcome_variable$name <- "acquittal"
reg$outcome_variable$definition <- "Binary: 1 if acquitted, 0 otherwise"
reg$analysis_plan$model_formula <- "acquittal ~ race_ethnicity + offense_severity + charge_type"

# Run analysis
results <- pre_registered_analysis(data, reg, disparate_impact_conviction)
```

#### Adding Controls
```r
# Update pre-registration controls
reg$control_variables$controls <- list(
  offense_severity = list(description = "Severity", type = "ordered factor", included = TRUE),
  charge_type = list(description = "Charge type", type = "factor", included = TRUE),
  age_at_arrest = list(description = "Age at arrest", type = "continuous", included = TRUE),
  socioeconomic_proxy = list(description = "SES proxy", type = "factor", included = FALSE)  // optional
)

# The system automatically only includes controls where included = TRUE
```

#### Changing the Predictor
```r
reg$predictor_variable$name <- "gender"
reg$predictor_variable$levels <- c("male", "female")
reg$predictor_variable$reference_level <- "male"
reg$analysis_plan$model_formula <- "conviction ~ gender + offense_severity + charge_type"
```

### Advanced Customization

#### Custom Analysis Functions
You can plug in your own analysis function:

```r
my_analysis <- function(data, group_var, outcome, controls, alpha = 0.05) {
  # Custom implementation
  # Must return list with:
  # - odds_ratios: data.frame with term, odds_ratio, ci_lower, ci_upper, p_value
  # - model: the fitted model object
  # - descriptive: descriptive statistics
  
  results <- glm(
    as.formula(paste(outcome, "~", group_var, "+", paste(controls, collapse = "+"))),
    data = data,
    family = binomial(),
    x = TRUE
  )
  
  or <- exp(coef(results))
  pval <- summary(results)$coefficients[paste0("group", group_var), "Pr(>|z|)"]
  
  list(
    odds_ratios = data.frame(
      term = c("(Intercept)", paste0("group", group_var)),
      odds_ratio = or,
      ci_lower = exp(confint(results))[2],
      ci_upper = exp(confint(results))[3],
      p_value = c(NA, pval)
    ),
    model = results,
    descriptive = list(n = nrow(data), conviction_rate = mean(data[[outcome]], na.rm = TRUE))
  )
}
```

## Quality Assurance

### Built-In Checks

The system automatically validates:

1. **Pre-registration completeness** - All required fields present
2. **Data quality** - Completeness scores, missing data patterns
3. **Model validity** - Convergence, separation, multicollinearity
4. **Disconfirmation thresholds** - All 6 tests must pass
5. **Output consistency** - Pre-registered vs. observed comparison

### Reporting Quality

Generated reports include:

- Effect sizes with 95% confidence intervals
- P-values and significance conclusions
- Disconfirmation test results (pass/fail per test)
- Deviations between pre-registered and observed
- Limitations and assumptions explicitly stated
- Data quality metrics
- Code reproducibility information

## Troubleshooting Common Issues

### Issue: "Model failed to converge"

**Solutions:**
- Check for complete separation in the data
- Try Firth's penalty method or Bayesian approach
- Remove problematic cases or add regularization
- Check for extreme weights or outliers

### Issue: "Disconfirmation tests fail"

**Solutions:**
- **Placebo tests fail**: Check for false positive bias; consider if data has systematic issues
- **Specification sensitivity fails**: Try different control variable sets; report effect range instead of point estimate
- **Negative controls fail**: Check for systemic methodology bias; may need to redesign analysis
- **Out-of-sample validation fails**: Effect may not generalize; collect more data or specify population more narrowly
- **Temporal robustness fails**: Effect may be period-specific; investigate what changed in different time periods
- **Alternative explanations fail**: Some effect may be due to confounders; qualify findings accordingly

### Issue: "Pre-registration validation fails"

**Solutions:**
- Check all required fields are present
- Ensure hypothesis has directional (one.sided or two.sided)
- Verify alpha is between 0 and 1
- Confirm model formula is valid R formula syntax
- Check inclusion criteria are specified

## Contributing & Extending

### Adding New Analysis Methods

1. Create a new R function following the interface pattern:
   - Input: data, group_var, outcome, controls, alpha
   - Output: list with odds_ratios, model, descriptive

2. Add to `akashicjustice.R` or create new file

3. Reference in `pre_registered_analysis()` if integrating into workflow

### Extending Disconfirmation Tests

1. Add new test function following `run_full_disconfirmation()` pattern
2. Add test to the 6-test suite
3. Update evidentiary thresholds if needed

### Improving Documentation

1. Update markdown files in `docs/`
2. Add examples to `example_analysis.R`
3. Create tutorial videos or guides
4. Update the user guide (this document)

## Citing the System

If you use the Akashic Justice Analysis System in research, please cite:

```
Akashic Justice Analysis Framework. (2024). Pre-registration & 
Disconfirmation Testing System for Legal Bias Analysis. Version 1.0. 
Akashic Civics Project. https://github.com/elijah/akashic-civics
```

## License

MIT License - See LICENSE file in repository root.

## Support

- Issues: GitHub Issues
- Questions: Discussions forum
- Documentation: README.md and docs/ directory
- Emergency: Check troubleshooting section above