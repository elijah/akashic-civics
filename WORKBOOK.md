# Akashic Justice Analysis System - Workbook

This workbook walks you through the complete process of conducting rigorous legal bias analysis using the Akashic Justice Analysis System. Complete the exercises to gain hands-on experience with pre-registration, disconfirmation testing, and reproducible research.

## Exercise 1: Setting Up Your Environment

### Goal: Install required software and verify installation

**R Installation Check**
```r
# Check R version
R.version.string

# Load required packages
packages <- c("dplyr", "survival", "mice", "ggplot2", "broom", "car", "lmtest")
installed <- packages %in% rownames(installed.packages())
if (any(!installed)) {
  install.packages(packages[!installed])
}
lapply(packages, library, character.only = TRUE)
print("All R packages loaded successfully")
```

**Node.js Installation Check**
```bash
node --version
npm --version
# Should show versions like v16.15.0 and 8.5.5
```

**Expected Output**: Confirmation that all required software is installed and accessible.

---

## Exercise 2: Understanding Pre-Registration

### Goal: Create and validate a pre-registration file

#### Part A: Create Pre-Registration
```bash
# Navigate to the project directory
cd /home/elw/Akashic-Civics

# Create a pre-registration
node scripts/pre-register/pre_register.js create \
  --question="Is there racial disparity in sentencing lengths for drug offenses in State X?" \
  --hypothesis="Black defendants receive longer sentences than white defendants for similar drug offenses, controlling for offense severity and criminal history" \
  --outcome=sentence_months \
  --predictor=race_ethnicity \
  --controls=offense_severity,prior_record_proxy,age_at_arrest \
  --alpha=0.05 \
  --output=workbook_registration.json
```

#### Part B: Validate Your Pre-Registration
```bash
node scripts/pre-register/pre_register.js validate --file=workbook_registration.json
```

#### Part C: Examine the File
```bash
cat workbook_registration.json
```

**Learning Points**:
- Pre-registration must be created BEFORE looking at data
- All key elements must be specified: question, hypothesis, variables, controls, method
- The file is timestamped and immutable once saved

---

## Exercise 3: Working with Sample Data

### Goal: Generate and explore sample data with known disparities

```bash
# Generate sample data (this creates data with known racial disparity)
cd docs/analysis-templates
Rscript example_analysis.R
```

This creates:
- `simulated_akashic_cases.rds` - R data file
- `simulated_akashic_cases.csv` - CSV version
- `example_analysis_report.md` - Methodology report
- Visualization PNG files

**Explore the Data**:
```r
# In R
cases <- readRDS("simulated_akashic_cases.rds")
dim(cases)  # Number of rows and columns
head(cases)  # First few rows
summary(cases$conviction)  # Conviction rate
table(cases$race_ethnicity, cases$conviction)  # Conviction by race
```

**Expected Findings**:
- Approximately 2000 cases
- Known 15% higher conviction rate for Black defendants (controlling for severity)
- Known 20% longer sentences for Black defendants (controlling for severity)

---

## Exercise 4: Running the Complete Analysis Workflow

### Goal: Execute the full pre-registered analysis with disconfirmation testing

```r
# In R - Load all required functions
source("akashicjustice.R")
source("disconfirmation.R")
source("pre_registration.R")

# Load your pre-registration
reg <- load_pre_registration("../workbook_registration.json")

# Load the sample data
cases <- readRDS("simulated_akashic_cases.rds")

# Run the complete workflow
results <- pre_registered_analysis(
  data = cases,
  registration = reg,
  analysis_function = disparate_impact_conviction,
  output_dir = "../workbook_results",
  verbose = TRUE
)

# Examine the results
print(results$comparison)
print(results$steps$data_verification$passed)
print(results$steps$plan_verification$passed)
if (!is.null(results$steps$disconfirmation)) {
  print(paste("Disconfirmation tests passed:", 
              results$steps$disconfirmation$overall$passed_count, 
              "/", 
              results$steps$disconfirmation$overall$total_count))
}
```

**What You Should See**:
- Data verification: PASS (data meets inclusion criteria)
- Plan verification: PASS (analysis matches pre-registration)
- Disconfirmation tests: Should pass most or all (data designed to have real effect)
- Comparison: Shows alignment between pre-registered and observed results

---

## Exercise 5: Testing Disconfirmation Robustness

### Goal: Understand how the system detects questionable research practices

#### Part A: Test with Modified Analysis (P-Hacking Simulation)

Try changing the analysis AFTER seeing the data:

```r
# Load data first (violates pre-registration principle!)
cases <- readRDS("simulated_akashic_cases.rds")

# THEN create pre-registration (BAD PRACTICE - HARKing)
reg_bad <- pre_registration_template()
reg_bad$research_question <- "Racial disparity in conviction rates"
reg_bad$hypothesis$statement <- "Black defendants have higher conviction rates"
reg_bad$outcome_variable$name <- "conviction"
reg_bad$predictor_variable$name <- "race_ethnicity"

# Try to run analysis - should fail verification
results_bad <- pre_registered_analysis(
  data = cases,
  registration = reg_bad,
  analysis_function = disparate_impact_conviction
)

# Check what failed
print(results_bad$steps$plan_verification$passed)  # Should be FALSE
```

#### Part B: Test with Alternative Hypothesis

Try testing a different relationship than what was pre-registered:

```r
# Create pre-registration for one hypothesis
reg_orig <- pre_registration_template()
reg_orig$research_question <- "Racial disparity in conviction rates"
reg_orig$hypothesis$statement <- "Black defendants have higher conviction rates"
reg_orig$outcome_variable$name <- "conviction"
reg_orig$predictor_variable$name <- "race_ethnicity"
reg_orig$analysis_plan$model_formula <- "conviction ~ race_ethnicity + offense_severity + charge_type + age_at_arrest"

# But test a different hypothesis (gender instead of race)
results_wrong <- pre_registered_analysis(
  data = cases,
  registration = reg_orig,  # Still says we're testing race
  analysis_function = function(data, group_var, outcome, controls, alpha) {
    # But actually test gender!
    disparate_impact_conviction(data, group_var = "gender", controls = controls, outcome = outcome, alpha = alpha)
  }
)

# Should fail plan verification
print(results_wrong$steps$plan_verification$passed)  # Should be FALSE
```

**Learning Points**:
- The system prevents HARKing (hypothesizing after results known)
- Changing analysis after seeing data triggers verification failures
- Pre-registration enforces honest hypothesis testing

---

## Exercise 6: Generating Reports and Documentation

### Goal: Create professional reports for stakeholders

```r
# After running Exercise 4, generate reports

# 1. Methodology report from analysis results
methodology_report <- generate_methodology_report(
  results$analysis_results,
  "Disparate Impact Analysis: Conviction Rates by Race/Ethnicity",
  "Your Name"
)
writeLines(methodology_report, "workbook_methodology_report.md")

# 2. Pre-registration report (includes comparison)
pr_report <- generate_pre_registration_report(reg)
writeLines(pr_report, "workbook_pr_report.md")

# 3. Final summary
cat("
# Workbook Exercise Complete

## Files Generated:
- workbook_methodology_report.md: Detailed methodology
- workbook_pr_report.md: Pre/post comparison report
- workbook_results/: Full analysis outputs

## Key Findings to Report:
- Effect size: [check results$analysis_results$odds_ratios]
- P-value: [check results$analysis_results$odds_ratios$p_value]
- Disconfirmation tests: [check results$steps$disconfirmation$overall]

## Next Steps:
1. Try varying the controls in your pre-registration
2. Test with different subgroups (gender, age groups)
3. Experiment with alternative outcomes (sentencing, time-to-disposition)
4. Try introducing known confounders to see how sensitivity analysis responds
")
```

---

## Exercise 7: Advanced - Custom Analysis Function

### Goal: Create and test your own analysis function

```r
# Create a custom analysis function for time-to-event with competing risks
my_competing_risks_analysis <- function(data, group_var, outcome, controls, alpha = 0.05) {
  # This is a simplified example - in practice you'd use competing risks models
  
  # Focus on time to conviction vs. time to dismissal
  data$time_to_event <- data$days_to_disposition
  data$event_type <- ifelse(data$conviction == 1, 1,  # 1 = conviction
                           ifelse(data$disposition == "dismissed", 2, 0))  # 2 = dismissal, 0 = censored
  
  # For simplicity, we'll just run a Cox model on conviction (treating dismissal as censored)
  library(survival)
  
  formula <- as.formula(paste("Surv(days_to_disposition, conviction) ~", 
                              group_var, "+", 
                              paste(controls, collapse = "+")))
  
  model <- coxph(formula, data = data, x = TRUE)
  
  # Extract results for the group variable
  summary_model <- summary(model)
  
  # Find the coefficient for our group variable (first level after reference)
  group_coef_idx <- grep(paste0("^group", group_var), rownames(summary_model$coefficients))
  
  if (length(group_coef_idx) > 0) {
    hr <- exp(summary_model$coefficients[group_coef_idx, "coef"])
    hr_lower <- exp(summary_model$conf.int[group_coef_idx, "3 %"])
    hr_upper <- exp(summary_model$conf.int[group_coef_idx, "4 %"])
    p_val <- summary_model$coefficients[group_coef_idx, "Pr(>|z|)"]
  } else {
    hr <- hr_lower <- hr_upper <- p_val <- NA
  }
  
  return(list(
    hazard_ratio = data.frame(
      term = paste0("group", group_var),
      hr = hr,
      ci_lower = hr_lower,
      ci_upper = hr_upper,
      p_value = p_val
    ),
    model = model,
    descriptive = list(
      n = nrow(data),
      events = sum(data$conviction, na.rm = TRUE),
      median_time = median(data$days_to_disposition, na.rm = TRUE)
    )
  ))
}

# Test it with our data
results_custom <- pre_registered_analysis(
  data = cases,
  registration = reg,  # Use same pre-registration but change function below
  analysis_function = my_competing_risks_analysis,
  output_dir = "../workbook_results_custom",
  verbose = TRUE
)

# Check if it worked
if (!is.null(results_custom$analysis_results$hazard_ratio)) {
  print("Custom analysis successful!")
  print(results_custom$analysis_results$hazard_ratio)
}
```

---

## Exercise 8: Validation and Quality Assurance

### Goal: Test the system's built-in quality checks

#### Part A: Test with Poor Quality Data

Create data with issues and see how the system responds:

```r
# Load good data
cases_good <- readRDS("simulated_akashic_cases.rds")

# Create bad version with missing core fields
cases_bad <- cases_good
cases_bad$race_ethnicity[1:100] <- NA  # Introduce missing demographics
cases_bad$age_at_arrest[50:150] <- NA   # Introduce missing age
cases_bad <- cases_bad[1:500,]          # Reduce sample size

# Try to run analysis
results_bad_data <- pre_registered_analysis(
  data = cases_bad,
  registration = reg,
  analysis_function = disparate_impact_conviction
)

# Check data verification
print(results_bad_data$steps$data_verification$passed)  # Should likely be FALSE
print(results_bad_data$steps$data_verification$checks)  # See what failed
```

#### Part B: Test with Impossible Data

Create logically impossible data:

```r
# Create data where minors have life sentences (impossible)
cases_impossible <- cases_good
cases_impossible$age_at_arrest[cases_impossible$age_at_arrent < 18] <- 15  # Make them young
cases_impossible$sentence_months[cases_impossible$age_at_arrent < 18 & cases_impossible$conviction == 1] <- 360  # Give them 30-year sentences

# Try analysis
results_impossible <- pre_registered_analysis(
  data = cases_impossible,
  registration = reg,
  analysis_function = disparate_impact_conviction
)

# Should still run but quality score will be low
print(results_impossible$steps$data_verification$passed)
print(paste("Data quality score:", results_impossible$data_quality_score))
```

---

## Exercise 9: Reproducibility Test

### Goal: Verify that your analysis is fully reproducible

```bash
# 1. Record the exact versions of everything used
R --version
node --version

# 2. Save your exact R package versions
Rscript -e 'writeLines(capture.output(sessioninfo::session_info()), "session_info.txt")'

# 3. Save your pre-registration
cp workbook_registration.json reproducible_analysis/preregistration.json

# 4. Save your data
cp simulated_akashic_cases.rds reproducible_analysis/data.rds

# 5. Document the exact command used
cat > reproducible_analysis/command.txt << EOF
Rscript -e '
source("akashicjustice.R")
source("disconfirmation.R") 
source("pre_registration.R")
reg <- load_pre_registration("preregistration.json")
cases <- readRDS("data.rds")
results <- pre_registered_analysis(cases, reg, disparate_impact_conviction, "output")
saveRDS(results, "results.rds")
'
EOF

# 6. Archive everything
tar -czvf reproducible_analysis_$(date +%Y%m%d).tar.gz reproducible_analysis/

echo "Your analysis is now fully reproducible! Anyone can:"
echo "1. Extract the tarball"
echo "2. Run the command in command.txt"
echo "3. Get identical results"
```

---

## Exercise 9: Putting It All Together - Mini Research Project

### Goal: Conduct a complete mini-research project from start to finish

**Research Question**: "Is there gender disparity in dismissal rates for low-level offenses, controlling for offense type and defendant age?"

#### Step 1: Pre-registration
```bash
node scripts/pre-register/pre_register.js create \
  --question="Gender disparity in dismissal rates for low-level offenses" \
  --hypothesis="Female defendants have higher dismissal rates than male defendants for misdemeanor offenses, controlling for offense type and age" \
  --outcome=dismissal  # You'll need to create this variable first
  --predictor=gender \
  --controls=offense_severity,age_at_arrest \
  --alpha=0.05 \
  --output=mini_project_pr.json
```

#### Step 2: Prepare Data
```r
# In R
cases <- readRDS("simulated_akashic_cases.rds")
# Create dismissal variable (opposite of conviction for simplicity)
cases$dismissal <- ifelse(cases$disposition == "dismissed", 1, 0)
# Filter to misdemeanors only
cases_misdemeanor <- cases[cases$offense_severity %in% c("misdemeanor_first", "misdemeanor_second"), ]
saveRDS(cases_misdemeanor, "misdemeanor_subset.rds")
```

#### Step 3: Validate Pre-Registration
```bash
node scripts/pre-register/pre_register.js validate --file=mini_project_pr.json
```

#### Step 4: Run Analysis
```r
# In R
source("akashicjustice.R")
source("disconfirmation.R")
source("pre_registration.R")

reg <- load_pre_registration("mini_project_pr.json")
cases <- readRDS("misdemeanor_subset.rds")

results <- pre_registered_analysis(
  data = cases,
  registration = reg,
  analysis_function = disparate_impact_conviction,
  output_dir = "mini_project_results"
)
```

#### Step 5: Report Results
```r
# Generate final report
report <- generate_pre_registration_report(reg)
writeLines(report, "mini_project_final_report.md")

# Print summary
cat("
# Mini Research Project Complete

## Research Question
Is there gender disparity in dismissal rates for low-level offenses, controlling for offense type and defendant age?

## Hypothesis
Female defendants have higher dismissal rates than male defendants for misdemeanor offenses, controlling for offense type and age.

## Data
- Cases: [number from results]
- Misdemeanor cases: [number from subset]
- Female proportion: [calculate from data]
- Male proportion: [calculate from data]

## Results
- Effect size: [check results]
- P-value: [check results]
- Conclusion: [check results]

## Disconfirmation Testing
- Tests passed: [check results$steps$disconfirmation$overall]

## Limitations
- Simulated data (not real court records)
- Dismissal variable approximated
- Limited control variables
- Single jurisdiction

## Next Steps for Future Research
1. Use real court data from Akashic pipeline
2. Add more controls (socioeconomic factors, attorney type)
3. Examine interaction effects (gender × race)
4. Study different offense categories separately
")
```

---

## Congratulations! You've Completed the Workbook

You now have hands-on experience with:

✅ **Pre-registration** - Specifying hypotheses before seeing data  
✅ **Data Quality Assessment** - Evaluating completeness and validity  
✅ **Rigorous Analysis** - Running appropriate statistical models  
✅ **Disconfirmation Testing** - Subjecting findings to 6 falsification tests  
✅ **Reproducibility** - Creating fully replicable workflows  
✅ **Transparent Reporting** - Documenting all steps and limitations  
✅ **Critical Thinking** - Understanding how to detect and avoid questionable research practices  

### Next Steps for Your Research

1. **Apply to Real Data**: Export actual cases from your Akashic pipeline
2. **Collaborate**: Share pre-registrations with colleagues for peer review
3. **Publish**: Use the methodology documentation as supplementary materials
4. **Educate**: Teach others these rigorous approaches
5. **Innovate**: Extend the system to new types of analysis or domains

### Remember the Core Principles

- **Falsifiability**: Your findings must survive attempts to disprove them
- **Pre-registration**: Specify your plan before seeing the data  
- **Transparency**: Document everything - including limitations
- **Humility**: Acknowledge what your analysis cannot determine
- **Reproducibility**: Others should be able to replicate your results exactly

The Akashic Justice Analysis System gives you the tools to conduct research that meets the highest standards of scientific rigor while remaining practical for real-world civic data analysis.

Keep questioning, keep verifying, and keep pursuing truth with methodological integrity!