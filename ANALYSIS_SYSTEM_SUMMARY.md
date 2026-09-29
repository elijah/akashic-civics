# Akashic Justice Statistical Analysis System - COMPLETE

## Overview
This system provides a methodologically rigorous framework for analyzing Akashic civic data to detect bias while minimizing false positives, HARKing, and p-hacking through mandatory pre-registration and comprehensive disconfirmation testing.

## Core Components

### 1. Disconfirmation Testing Framework (`disconfirmation.R`)
Implements 6 mandatory falsification tests that ALL findings must pass to be considered credible:

| Test | Purpose | Evidentiary Value if PASSED |
|------|---------|----------------------------|
| **Placebo Tests** | Detect false positive bias | Methodology doesn't detect effects where none exist |
| **Specification Sensitivity** | Check robustness | Effect consistent across model specifications |
| **Negative Controls** | Detect systemic bias | Main effect significant; controls not significant |
| **Out-of-Sample Validation** | Check generalizability | Effect replicates in holdout data |
| **Temporal Robustness** | Check stability | Effect consistent across time periods |
| **Alternative Explanation Testing** | Rule out confounders | No alternative explanation (complexity, screening, plea, geography, temporal trends, judge assignment) supported |

### 2. Pre-Registration System (`pre_registration.R`)
Enforces separation of hypothesis generation from testing:

- **Template Creation**: `pre_registration_template()` defines hypothesis, outcome, predictors, controls, analysis plan BEFORE data examination
- **Verification**: 
  - `verify_data_processing()` - Checks data meets inclusion/exclusion criteria
  - `verify_analysis_plan()` - Confirms analysis spec matches pre-registration
  - `verify_analysis()` - Validates output matches pre-registered plan
- **Comparison**: `compare_pre_post()` quantifies deviations between pre-registered and observed results
- **Reporting**: `generate_pre_registration_report()` creates comprehensive markdown documentation
- **Workflow Orchestration**: `pre_registered_analysis()` runs complete pipeline: verify → analyze → disconfirm → report

### 3. Core Analysis Functions (`akashicjustice.R`)
Provides statistical methods for legal bias analysis:
- `disparate_impact_conviction()` - Logistic regression with controls
- `sentencing_disparity()` - Linear regression on sentence length
- `time_to_disposition()` - Survival analysis (Cox model)
- `impute_missing_demographics()` - Multiple imputation for missing data
- `evalue_sensitivity()` - Quantifies robustness to unmeasured confounding
- `generate_methodology_report()` - Creates methodological documentation
- `import_akashic_cases()` - Loads normalized JSON exports from Akashic pipeline

### 4. Documentation (`README.md`)
Complete user guide with:
- Installation instructions for required R packages
- Step-by-step usage examples
- Architectural overview of the complete workflow
- Evidentiary standards and pass criteria
- Integration instructions with Akashic pipeline
- Example workflow from pre-registration to final report

## Usage Workflow

```r
# 1. Load all components
source("akashicjustice.R")
source("disconfirmation.R") 
source("pre_registration.R")

# 2. Create pre-registration BEFORE data examination
reg <- pre_registration_template()
# Fill in: research question, hypothesis, variables, controls, analysis plan
save_pre_registration(reg, "my_pre_registration.rds")  # IMMUTABLE timestamp

# 3. Run full workflow (verification + analysis + disconfirmation + reporting)
results <- pre_registered_analysis(
  data = cases,                           # From import_akashic_cases()
  registration = "my_pre_registration.rds",
  analysis_function = disparate_impact_conviction,
  output_dir = "results/"
)

# 4. Check results/
#    - Full results object (.rds)
#    - Human-readable report (.md)
#    - Copy of pre-registration
#    - Disconfirmation test details
```

## Evidentiary Thresholds

A finding is **credible evidence of bias** ONLY if:
1. ✅ Pre-registered before data examination
2. ✅ All verification checks pass (data & analysis match pre-registration)
3. ✅ Survives ALL 6 disconfirmation tests
4. ✅ Effect size and direction consistent with hypothesis
5. ✅ No major deviations flagged in comparison report

## Integration with Akashic Pipeline

```bash
# Export data from Akashic pipeline
npm run export-legal-data -- --output-format=json --file=civic_cases.json

# In R analysis:
library(jsonlite)
cases <- import_akashic_cases("civic_cases.json")
# ... run pre_registered_analysis()
```

## Files Created

```
docs/analysis-templates/
├── akashicjustice.R          # Core analysis functions (418 lines)
├── disconfirmation.R         # 6-test falsification framework (796 lines)
├── pre_registration.R        # Pre-registration + workflow system (958 lines)
├── example_analysis.R        # End-to-end example (296 lines)
└── README.md                 # Complete user guide (13010 lines)
```

## Methodological Guarantees

This system ensures:
- ❌ No HARKing (hypothesizing after results known)
- ❌ No p-hacking (flexible analysis until significant)
- ❌ No false positive bias (via placebo tests)
- ❌ No systemic methodology bias (via negative controls)
- ❌ No overfitting (via out-of-sample validation)
- ❌ No time-period artifacts (via temporal robustness)
- ❌ No confounding by alternative explanations (via explicit testing)
- ✅ Full transparency (all deviations documented)
- ✅ Complete reproducibility (workflow objects saved)
- ✅ Conservative inference (requires passing ALL tests)

The framework transforms legal bias analysis from exploratory hypothesis generation to rigorous hypothesis testing, providing evidence that meets the highest standards for social science research while being directly applicable to civic data analysis workflows.