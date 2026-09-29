# Akashic Justice Analysis System - API Reference

## Table of Contents

1. [R Analysis API](#r-analysis-api)
2. [R Pre-Registration API](#r-pre-registration-api)
3. [R Disconfirmation API](#r-disconfirmation-api)
4. [JavaScript Provenance API](#javascript-provenance-api)
3. [JavaScript Historical Baseline API](#javascript-historical-baseline-api)
4. [CLI Pre-Registration API](#cli-pre-registration-api)

---

## R Analysis API

### `import_akashic_cases(filepath)`

**Description**: Import normalized legal case data from Akashic JSON export.

**Parameters**:
- `filepath` (string): Path to JSON file with Akashic normalized cases

**Returns**: Data frame with standardized columns

**Example**:
```r
cases <- import_akashic_cases("putnam_cases.json")
```

---

### `disparate_impact_conviction(data, group_var, controls, outcome = "conviction")`

**Description**: Test for disparate impact in conviction rates using logistic regression.

**Parameters**:
- `data` (data.frame): Normalized case data
- `group_var` (string): Predictor variable name (e.g., "race_ethnicity")
- `controls` (character vector): Control variables (e.g., c("offense_severity", "charge_type"))
- `outcome` (string): Outcome variable name (default: "conviction")

**Returns**: List with:
- `descriptive`: Descriptive statistics by group
- `chisq_test`: Chi-square test results
- `odds_ratios`: Data frame with odds ratios, CIs, p-values
- `model_summary`: Full model summary
- `model`: Fitted glm object
- `adjusted_predictions`: Predicted probabilities

**Example**:
```r
results <- disparate_impact_conviction(
  cases,
  group_var = "race_ethnicity",
  controls = c("offense_severity", "charge_type", "age_at_arrest")
)
```

---

### `sentencing_disparity(data, group_var, controls, outcome = "sentence_months")`

**Description**: Analyze sentencing disparities using linear regression on log-transformed sentence length.

**Parameters**:
- `data` (data.frame): Normalized case data
- `group_var` (string): Predictor variable name
- `controls` (character vector): Control variables
- `outcome` (string): Sentence length variable (default: "sentence_months")

**Returns**: List with:
- `descriptive`: Sentence statistics by group
- `percent_differences`: Adjusted percentage differences
- `coeftest_robust`: Robust coefficient tests
- `model`: Fitted lm object

---

### `time_to_disposition(data, group_var, controls, time_var = "days_to_disposition", event_var = "conviction")`

**Description**: Survival analysis of time to disposition using Cox proportional hazards model.

**Parameters**:
- `data` (data.frame): Normalized case data
- `group_var` (string): Predictor variable name
- `controls` (character vector): Control variables
- `time_var` (string): Time variable name
- `event_var` (string): Event variable name

**Returns**: List with:
- `cox_model`: Fitted Cox model
- `ph_test`: Proportional hazards test
- `descriptive`: Time statistics by group

---

### `impute_missing_demographics(data, m = 5, maxit = 10)`

**Description**: Multiple imputation for missing demographic data using MICE.

**Parameters**:
- `data` (data.frame): Case data with missing values
- `m` (integer): Number of imputed datasets (default: 5)
- `maxit` (integer): Maximum iterations (default: 10)

**Returns**: List with:
- `imputed_datasets`: List of m completed datasets
- `method`: Imputation methods used
- `loggedEvents`: Imputation log

---

### `evalue_sensitivity(or, ci_lower, ci_upper)`

**Description**: Calculate E-value for sensitivity to unmeasured confounding.

**Parameters**:
- `or` (numeric): Observed odds ratio
- `ci_lower` (numeric): Lower bound of 95% CI
- `ci_upper` (numeric): Upper bound of 95% CI

**Returns**: List with:
- `e_value`: E-value for point estimate
- `e_value_ci_lower`: E-value for CI lower bound
- `interpretation`: Human-readable interpretation

---

### `generate_methodology_report(results, title, author)`

**Description**: Generate comprehensive markdown methodology report.

**Parameters**:
- `results`: Results object from analysis function
- `title` (string): Analysis title
- `author` (string): Author name

**Returns**: Character string (markdown report)

---

## R Pre-Registration API

### `pre_registration_template()`

**Description**: Create a blank pre-registration template with all required fields.

**Returns**: List with empty template

**Fields**:
```r
list(
  research_question = "string",
  hypothesis = list(statement = "string", directional = "one.sided|two.sided", alpha = 0.05),
  outcome_variable = list(name = "string", definition = "string", type = "binary|continuous"),
  predictor_variable = list(name = "string", levels = c(), reference_level = "string", coding = "factor"),
  control_variables = list(
    controls = list(
      var1 = list(description = "string", type = "string", included = TRUE)
    ),
    inclusion_criteria = list(n_required = 30, exclude_pending = TRUE, exclude_dismissed = TRUE)
  ),
  analysis_plan = list(
    method = "string", model_formula = "string", 
    software = "R", packages = c(), robust_errors = TRUE
  ),
  significance_threshold = list(alpha = 0.05, two.sided = FALSE, adjustment_method = "none"),
  pre_registered_effect_size = NULL,
  pre_registered_p_value = NULL,
  pre_registered_conclusion = NULL,
  discrepancy_notes = NULL,
  pre_registration_metadata = list(created = NULL, author = NULL, purpose = "string")
)
```

---

### `save_pre_registration(registration, filepath)`

**Description**: Save pre-registration to RDS file with validation.

**Parameters**:
- `registration` (list): Pre-registration object
- `filepath` (string): Output file path

**Returns**: None (saves to disk)

---

### `load_pre_registration(filepath)`

**Description**: Load pre-registration from RDS file.

**Parameters**:
- `filepath` (string): Path to pre-registration file

**Returns**: Pre-registration object

---

### `verify_data_processing(data, registration)`

**Description**: Verify that processed data meets pre-registration criteria.

**Parameters**:
- `data` (data.frame): Processed dataset
- `registration` (list): Pre-registration object

**Returns**: List with `passed` (boolean) and `checks` (list)

---

### `verify_analysis_plan(analysis_spec, registration, verbose = TRUE)`

**Description**: Verify that analysis specification matches pre-registration.

**Parameters**:
- `analysis_spec` (list): Analysis specification (from pre_registered_analysis)
- `registration` (list): Pre-registration object
- `verbose` (boolean): Print verification messages

**Returns**: List with `passed` (boolean) and `deviations` (list)

---

### `compare_pre_post(registration, observed_effect, observed_p, observed_conclusion)`

**Description**: Compare pre-registered vs observed results.

**Parameters**:
- `registration` (list): Pre-registration with observed fields filled
- `observed_effect` (numeric): Observed effect size
- `observed_p` (numeric): Observed p-value
- `observed_conclusion` (string): "reject null" or "fail to reject null"

**Returns**: List with registration and discrepancies

---

### `generate_pre_registration_report(registration)`

**Description**: Generate comprehensive markdown pre-registration report.

**Parameters**:
- `registration` (list): Pre-registration object (with observed results filled)

**Returns**: Character string (markdown report)

---

### `pre_registered_analysis(data, registration, analysis_function, output_dir = ".", verbose = TRUE)`

**Description**: Complete pre-registered analysis workflow.

**Parameters**:
- `data` (data.frame): Case data
- `registration` (list or string): Pre-registration object or file path
- `analysis_function` (function): Analysis function to run
- `output_dir` (string): Output directory
- `verbose` (boolean): Print progress

**Returns**: List with all results, verification, disconfirmation tests, and comparison

---

## R Disconfirmation API

### `run_full_disconfirmation(data, analysis_function, analysis_spec, placebo_specs = NULL, alternative_specs = NULL, negative_controls = NULL, time_var = "date")`

**Description**: Run complete 6-test disconfirmation protocol.

**Parameters**:
- `data` (data.frame): Case data
- `analysis_function` (function): Analysis function
- `analysis_spec` (list): Analysis specification
- `placebo_specs` (list): Placebo test periods
- `alternative_specs` (list): Alternative model specifications
- `negative_controls` (character vector): Negative control outcomes
- `time_var` (string): Time variable name

**Returns**: List with all test results and overall evaluation

---

## JavaScript Provenance API

### `ProvenanceTracker` class

```javascript
const tracker = new ProvenanceTracker();
```

#### `addEntry(caseId, entry)`

**Parameters**:
- `caseId` (string): Case identifier
- `entry` (object): Provenance entry with fields:
  - `sourceConnector` (string)
  - `sourceVersion` (string)
  - `ingestionTimestamp` (ISO string)
  - `dataQualityScore` (number 0-100)
  - `qualityFlags` (string array)
  - `transformationHistory` (array of objects with step, timestamp, description, parameters)

#### `getEntry(caseId)`

**Returns**: Provenance entry or undefined

#### `getAllEntries()`

**Returns**: Object with all entries

#### `exportProvenance()`

**Returns**: JSON string of all provenance data

#### `getQualityReport()`

**Returns**: Object with:
- `totalCases` (number)
- `avgQualityScore` (number)
- `qualityHistogram` (object)
- `commonIssues` (array of {issue, count})
- `sourceBreakdown` (object)

---

## JavaScript Historical Baseline API

### `HistoricalBaseline` class

```javascript
const baseline = new HistoricalBaseline('./snapshots');
```

#### `createSnapshot(jurisdictionId, cases)`

**Parameters**:
- `jurisdictionId` (string): Jurisdiction identifier
- `cases` (array): Case objects with conviction, sentence_months, days_to_disposition, race_ethnicity, offense_severity, missing_fields

**Returns**: Snapshot object with:
- `snapshot_id`
- `timestamp`
- `jurisdiction_id`
- `case_count`
- `key_statistics` (conviction_rate, avg_sentence_months, etc.)
- `derived_variables`

#### `compareWithBaseline(currentSnapshot, baselineSnapshotId)`

**Parameters**:
- `currentSnapshot` (object): Current snapshot
- `baselineSnapshotId` (string): Baseline snapshot ID

**Returns**: Object with:
- `current`, `baseline`
- `effect_size`, `percent_change`
- `is_significant` (boolean)
- `interpretation` (string)

#### `getSnapshots(jurisdictionId)`

**Returns**: Array of snapshots for jurisdiction

#### `getMostRecentSnapshot()`

**Returns**: Most recent snapshot or null

#### `detectChangePoints(jurisdictionId)`

**Returns**: Array of change points with point, before_rate, after_rate, magnitude

#### `exportSnapshots(jurisdictionId)`

**Returns**: JSON string of snapshots

---

## CLI Pre-Registration API

### `node scripts/pre-register/pre_register.js create [options]`

**Options**:
- `--question="text"`: Research question
- `--hypothesis="text"`: Hypothesis statement
- `--outcome=name`: Outcome variable name
- `--outcome_definition="text"`: Outcome definition
- `--predictor=name`: Predictor variable name
- `--controls=csv`: Comma-separated control variables
- `--alpha=0.05`: Significance level
- `--output=path`: Output file path

**Example**:
```bash
node pre_register.js create \
  --question="Racial disparity in conviction rates" \
  --hypothesis="Black defendants have higher conviction rates" \
  --outcome=conviction \
  --predictor=race_ethnicity \
  --controls=offense_severity,charge_type \
  --alpha=0.05
```

---

### `node scripts/pre-register/pre_register.js validate --file=path`

**Options**:
- `--file=path`: Path to pre-registration JSON

**Output**: "Valid: true" or "Valid: false" with issues list

---

### `node scripts/pre-register/pre_register.js compare --file=path --effect=num --p=num [--conclusion="text"]`

**Options**:
- `--file=path`: Path to pre-registration JSON
- `--effect=num`: Observed effect size (OR)
- `--p=num`: Observed p-value
- `--conclusion="text"`: "reject null" or "fail to reject null"

**Output**: JSON with pre-registered vs observed comparison

---

## Data Schema Reference

### Required Case Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique case ID |
| jurisdiction_id | string | Yes | Jurisdiction code |
| race_ethnicity | string | Yes | Demographic |
| age_at_arrest | numeric | Yes | Age at arrest |
| offense_severity | string | Yes | Offense level |
| charge_type | string | Yes | Charge category |
| conviction | binary | Yes | 0/1 conviction |
| sentence_months | numeric | Conditional | If convicted |
| days_to_disposition | numeric | Yes | Case duration |

### Offense Severity Levels (Ordered)

```javascript
const SEVERITY_ORDER = [
  "infraction",
  "violation", 
  "misdemeanor_second",
  "misdemeanor_first",
  "felony_third",
  "felony_second",
  "felony_first"
];
```

### Charge Types

```javascript
const CHARGE_TYPES = [
  "violent", "property", "drug", 
  "public_order", "white_collar", "other"
];
```

### Disposition Outcomes

```javascript
const DISPOSITIONS = [
  "dismissed", "convicted", "acquitted", 
  "diverted", "pending"
];
```

---

## Error Codes

| Code | Meaning | Resolution |
|------|---------|------------|
| E001 | Missing required field | Add field to pre-registration |
| E002 | Invalid directional | Use "one.sided" or "two.sided" |
| E003 | Invalid alpha | Use 0 < alpha < 1 |
| E004 | Model convergence failed | Check separation, add regularization |
| E005 | Placebo test failed | False positive bias detected |
| E006 | Specification sensitivity failed | Effect not robust |
| E007 | Negative control failed | Systemic methodology bias |
| E008 | Out-of-sample validation failed | Overfitting or non-generalizable |
| E009 | Temporal robustness failed | Period-specific effect |
| E010 | Alternative explanation supported | Confounding detected |