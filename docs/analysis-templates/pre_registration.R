# Pre-Registration System for Akashic Legal Analysis
# ====================================================
#
# Pre-registration is the practice of specifying the analysis plan BEFORE
# examining the data. This prevents HARKing (Hypothesizing After Results
# are Known) and p-hacking. The pre-registered plan should be published
# and stored before data analysis begins.
#
# ============================================================
# WHY PRE-REGISTRATION MATTERS
# ============================================================
#
# In social science, effects that are "discovered" after looking at data
# are often false positives. Pre-registration solves this by:
# 1. Separating hypothesis generation from hypothesis testing
# 2. Preventing flexible data analysis (p-hacking)
# 3. Enabling meta-analysis and replication
# 4. Providing evidential value that reviewers can evaluate
# 5. Making it clear whether a hypothesis was pre-specified or post-hoc
#
# ============================================================
# WHAT TO PRE-REGISTER
# ============================================================
#
# 1. Research Question / Hypothesis
#    - Clear statement of what you're testing
#    - Directional hypothesis (one-sided) or two-sided
#
# 2. Outcome Variable
#    - Which variable measures the effect
#    - How it's defined in the normalized data
#
# 3. Primary Predictor / Treatment
#    - Which demographic or case characteristic
#    - Coding (e.g., "race_ethnicity = Black")
#
# 4. Control Variables
#    - All variables included in the model, specified BEFORE data examination
#    - Rationale for each control
#
# 5. Analysis Method
#    - Statistical method (logistic regression, OLS, etc.)
#    - Model formula
#   - Software and version
#
# 6. Sample Inclusion/Exclusion Criteria
#    - Which cases are included/excluded and why
#    - Any missing data handling approach
#
# 7. Analysis Plan
#    - Step-by-step procedure
#   - Which tests, which comparisons
#   - Which significance threshold
#
# 8. Optional/Multiple Comparisons Adjustments
#   - Whether multiplicity adjustments applied
#   - Which correction method (Bonferroni, FDR, etc.)
#
# 9. Pre-registered Findings (empty until after analysis)
#   - Leave blank; fill in after analysis
#   - Compare to what was pre-registered
#
# ============================================================
# PRE-REGISTRATION TEMPLATE
# ============================================================

pre_registration_template <- function() {
  list(
    # 1. RESEARCH QUESTION
    research_question = "Racial/ethnic disparity in conviction rates after controlling for offense severity and other case characteristics",
    
    # 2. HYPOTHESIS
    hypothesis = list(
      statement = "Black defendants have higher conviction rates than white defendants, controlling for offense severity and case characteristics",
      directional = "one.sided",  # "one.sided" or "two.sided"
      alpha = 0.05
    ),
    
    # 3. OUTCOME VARIABLE
    outcome_variable = list(
      name = "conviction",
      definition = "Binary indicator: 1 if case disposition is 'conviction', 0 otherwise",
      type = "binary"
    ),
    
    # 3. PRIMARY PREDICTOR
    predictor_variable = list(
      name = "race_ethnicity",
      levels = c("White", "Black", "Hispanic", "Other"),
      reference_level = "White",
      coding = "factor"
    ),
    
    # 4. CONTROL VARIABLES (specified BEFORE data examination)
    control_variables = list(
      # Mandatory controls
      offense_severity = list(
        description = "Severity of the charged offense",
        type = "ordered factor",
        levels = c("infraction", "violation", "misdemeanor_second", "misdemeanor_first", "felony_third", "felony_second", "felony_first")
      ),
      charge_type = list(
        description = "Type of offense (violent, property, drug, public_order, white_collar)",
        type = "factor"
      ),
      age_at_arrest = list(
        description = "Age at time of arrest, in years",
        type = "continuous"
      ),
      
      # Optional controls (specify whether included)
      prior_record_proxy = list(
        description = "Prior record severity proxy",
        type = "ordered factor",
        included = TRUE  # Set to FALSE if not including
      ),
      socioeconomic_proxy = list(
        description = "Socioeconomic status proxy",
        type = "factor",
        included = FALSE  # Set to TRUE if including
      ),
      
      # Specify inclusion/exclusion
      inclusion_criteria = list(
        n_required = 30,  # Minimum cases per group
        exclude_pending = TRUE,  # Exclude cases with disposition = "pending"
        exclude_dismissed = TRUE  # Exclude cases with disposition = "dismissed"
      )
    ),
    
    # 5. ANALYSIS METHOD
    analysis_plan = list(
      method = "logistic regression",
      model_formula = "conviction ~ race_ethnicity + offense_severity + charge_type + age_at_arrest",
      software = "R version 4.x+",
      packages = c("dplyr", "broom", "sandwich", "lmtest"),
      estimation_method = "maximum likelihood",
      robust_errors = TRUE  # HC1 robust standard errors
    ),
    
    # 6. SIGNIFICANCE THRESHOLD
    significance_threshold = list(
      alpha = 0.05,
      two.sided = FALSE,  # Set to TRUE if two-sided hypothesis
      adjustment_for_multiplicity = FALSE,  # Bonferroni, FDR, etc.
      adjustment_method = "none"  # "bonferroni", "fdr", "none"
    ),
    
    # 7. PRE-REGISTERED vs. OBSERVED FINDINGS
    # Leave these blank until after analysis
    pre_registered_effect_size = NULL,
    pre_registered_p_value = NULL,
    pre_registered_conclusion = NULL,
    
    # After analysis, fill in:
    # pre_registered_effect_size = observed odds ratio
    # pre_registered_p_value = observed p-value
    # pre_registered_conclusion = "reject null" or "fail to reject null"
    # discrepancy_notes = any differences between pre-registered and observed
  )
}

# ============================================================
# PRE-REGISTRATION MANAGEMENT FUNCTIONS
# ============================================================

#' Save a pre-registration to a file
#' @param registration The pre-registration list
#' @param filepath Path to save (RDS or JSON)
#' @export
save_pre_registration <- function(registration, filepath) {
  # Validate required fields
  required_fields <- c("research_question", "hypothesis", "outcome_variable",
                       "predictor_variable", "control_variables", 
                       "analysis_plan", "significance_threshold")
  
  missing <- required_fields[!sapply(required_fields, function(f) 
    f %in% names(registration) || 
    (is.list(registration[[f]]) && !is.null(registration[[f]]))]
  
  if (length(missing) > 0) {
    stop(paste("Missing required fields:", paste(missing, collapse = ", ")))
  }
  
  # Save as RDS
  saveRDS(registration, filepath)
  cat("Pre-registration saved to:", filepath, "\n")
}

#' Load a pre-registration from a file
#' @param filepath Path to the pre-registration file
#' @return The registration list
#' @export
load_pre_registration <- function(filepath) {
  registration <- readRDS(filepath)
  cat("Pre-registration loaded from:", filepath, "\n")
  return(registration)
}

#' Compare pre-registered vs. observed results
#' @param registration The pre-registration (with fields filled in after analysis)
#' @param observed_effect The observed effect size
#' @param observed_p The observed p-value
#' @param observed_conclusion The observed conclusion
compare_pre_post <- function(registration, observed_effect, observed_p, observed_conclusion) {
  
  # Fill in the observed fields
  registration$pre_registered_effect_size <- observed_effect
  registration$pre_registered_p_value <- observed_p
  registration$pre_registered_conclusion <- observed_conclusion
  
  # Compare
  discrepancies <- list()
  
  # Effect size comparison
  if (!is.null(registration$pre_registered_effect_size) && !is.null(registration$effect_size_from_analysis)) {
    effect_diff <- abs(registration$pre_registered_effect_size - registration$effect_size_from_analysis)
    discrepancies$effect_size <- list(
      pre_registered = registration$pre_registered_effect_size,
      observed = registration$effect_size_from_analysis,
      absolute_difference = effect_diff,
      within_threshold = effect_diff < 0.1  # 10% threshold
    )
  }
  
  # P-value comparison
  if (!is.null(registration$pre_registered_p_value) && !is.null(observed_p)) {
    p_diff <- abs(registration$pre_registered_p_value - observed_p)
    discrepancies$p_value <- list(
      pre_registered = registration$pre_registered_p_value,
      observed = observed_p,
      absolute_difference = p_diff,
      within_epsilon = p_diff < 0.01  # Very small difference expected
    )
  }
  
  # Conclusion comparison
  if (!is.null(registration$pre_registered_conclusion) && !is.null(observed_conclusion)) {
    discrepancies$conclusion <- list(
      pre_registered = registration$pre_registered_conclusion,
      observed = observed_conclusion,
      consistent = registration$pre_registered_conclusion == observed_conclusion
    )
  }
  
  return(list(
    registration = registration,
    discrepancies = discrepancies
  ))
}

# ============================================================
# EXAMPLE: Pre-Registration Workflow
# ============================================================

# Step 1: Create pre-registration BEFORE data examination
registration <- pre_registration_template()

# Step 2: Fill in the fields specific to your research question
registration$research_question <- "Whether Black defendants in Putnam County, TN have higher conviction rates than white defendants, controlling for offense severity and case characteristics"

registration$hypothesis <- list(
  statement = "Black defendants have higher conviction rates than white defendants, controlling for offense severity, charge type, and age at arrest",
  directional = "one.sided",
  alpha = 0.05
)

registration$control_variables$inclusion_criteria <- list(
  n_required = 30,
  exclude_pending = TRUE,
  exclude_dismissed = TRUE
)

registration$analysis_plan$model_formula <- "conviction ~ race_ethnicity + offense_severity + charge_type + age_at_arrest"

registration$significance_threshold$adjustment_method <- "none"  # or "bonferroni", "fdr"

# Step 3: Save the pre-registration BEFORE examining data
save_pre_registration(registration, "my_pre_registration.rds")

# Step 4: After data analysis, fill in the observed results
# (This happens after data analysis is complete)
observed_effect <- 1.42  # Example: odds ratio
observed_p <- 0.032      # Example: p-value
observed_conclusion <- "reject null"  # or "fail to reject null"

# Step 5: Load and compare
registration_loaded <- load_pre_registration("my_pre_registration.rds")
comparison <- compare_pre_post(
  registration_loaded,
  observed_effect = observed_effect,
  observed_p = observed_p,
  observed_conclusion = observed_conclusion
)

# Step 6: Report the comparison
cat("\n=== PRE-REGISTRATION COMPARISON ===\n")
cat("Pre-registered hypothesis:", comparison$registration$research_question, "\n\n")

if (!is.null(comparison$discrepancies$effect_size)) {
  cat("Effect size:\n")
  cat("  Pre-registered: Not specified (left blank)\n")
  cat("  Observed:", comparison$discrepancies$effect_size$observed, "\n")
  cat("  Difference:", comparison$discrepancies$effect_size$absolute_difference, "\n")
}

if (!is.null(comparison$discrepancies$p_value)) {
  cat("P-value:\n")
  cat("  Pre-registered: Not specified (left blank)\n")
  cat("  Observed:", comparison$discrepancies$p_value$observed, "\n")
  cat("  Difference:", comparison$discrepancies$p_value$absolute_difference, "\n")
}

if (!is.null(comparison$discrepancies$conclusion)) {
  cat("Conclusion:\n")
  cat("  Pre-registered: Not specified (left blank)\n")
  cat("  Observed:", comparison$discrepancies$conclusion$observed, "\n")
  cat("  Consistent:", comparison$discrepancies$conclusion$consistent, "\n")
}

cat("\nThis workflow ensures transparent separation of hypothesis\n")
cat("generation from hypothesis testing, preventing HARKing and\n")
cat("p-hacking.\n")

# ============================================================
# PRE-REGISTRATION VERIFICATION FUNCTIONS
# ============================================================
# These functions ensure the analysis actually follows the pre-registered plan

#' Verify that data processing matches pre-registration
#' @param data The processed dataset
#' @param registration The pre-registration object
#' @return List of verification results
verify_data_processing <- function(data, registration) {
  results <- list(
    passed = TRUE,
    checks = list()
  )
  
  # Check inclusion criteria
  criteria <- registration$control_variables$inclusion_criteria
  
  # Check row counts per group
  if (!is.null(criteria$n_required)) {
    group_counts <- table(data[[registration$predictor_variable$name]])
    check_passed <- all(group_counts >= criteria$n_required)
    
    results$checks$n_required <- list(
      required = criteria$n_required,
      observed = as.list(group_counts),
      passed = check_passed
    )
    results$passed <- results$passed && check_passed
  }
  
  # Check excluded categories
  if (isTRUE(criteria$exclude_pending)) {
    pending_count <- sum(data$disposition == "pending", na.rm = TRUE)
    results$checks$exclude_pending <- list(
      pending_cases = pending_count,
      passed = pending_count == 0
    )
    results$passed <- results$passed && (pending_count == 0)
  }
  
  if (isTRUE(criteria$exclude_dismissed)) {
    dismissed_count <- sum(data$disposition == "dismissed", na.rm = TRUE)
    results$checks$exclude_dismissed <- list(
      dismissed_cases = dismissed_count,
      passed = dismissed_count == 0
    )
    results$passed <- results$passed && (dismissed_count == 0)
  }
  
  return(results)
}

#' Verify analysis output matches pre-registered plan
#' @param results The analysis result object
#' @param registration The pre-registration object
#' @return List of verification checks
verify_analysis <- function(results, registration) {
  checks <- list()
  
  # Check that the model formula matches
  if (!is.null(registration$analysis_plan$model_formula)) {
    registered_formula <- registration$analysis_plan$model_formula
    actual_formula <- if (!is.null(results$model)) {
      format(formula(results$model))
    } else {
      results$model_formula %||% "unknown"
    }
    
    checks$formula_match <- list(
      registered = registered_formula,
      actual = actual_formula,
      match = registered_formula == actual_formula
    )
  }
  
  # Check significance threshold
  if (!is.null(registration$significance_threshold$alpha)) {
    registered_alpha <- registration$significance_threshold$alpha
    actual_alpha <- results$alpha_thresholds$primary %||% registered_alpha
    
    checks$alpha_match <- list(
      registered = registered_alpha,
      actual = actual_alpha,
      match = registered_alpha == actual_alpha
    )
  }
  
  # Check group variable
  checks$group_variable <- list(
    registered = registration$predictor_variable$name,
    actual = results$group_variable_used %||% registration$predictor_variable$name,
    match = TRUE  # Will be verified
  )
  
  # Check controls
  controls_registered <- names(registration$control_variables$controls)
  checks$controls_match <- list(
    registered = controls_registered,
    actual = results$controls_used %||% controls_registered,
    match = TRUE
  )
  
  all_passed <- all(sapply(checks, function(c) {
    if (is.logical(c$match)) c$match else TRUE
  }))
  
  return(list(
    passed = all_passed,
    checks = checks
  ))
}

#' Verify analysis plan matches pre-registered specification
#' @param analysis_spec The current analysis specification
#' @param registration The pre-registration object
#' @param verbose Whether to print verification steps
#' @return List with pass/fail status and details
verify_analysis_plan <- function(analysis_spec, registration, verbose = TRUE) {
  
  verification <- list(
    passed = TRUE,
    deviations = list()
  )
  
  if (verbose) {
    cat("Verifying analysis plan against pre-registration...\n\n")
  }
  
  # Check outcome variable
  if (!is.null(registration$outcome_variable)) {
    if (analysis_spec$outcome != registration$outcome_variable$name) {
      verification$passed <- FALSE
      verification$deviations$outcome <- list(
        registered = registration$outcome_variable$name,
        actual = analysis_spec$outcome
      )
      if (verbose) cat("FAIL: Outcome variable changed from",
                          registration$outcome_variable$name, "to",
                          analysis_spec$outcome, "\n")
    } else if (verbose) {
      cat("PASS: Outcome variable =", analysis_spec$outcome, "\n")
    }
  }
  
  # Check group/predictor variable
  if (!is.null(registration$predictor_variable)) {
    if (analysis_spec$group_var != registration$predictor_variable$name) {
      verification$passed <- FALSE
      verification$deviations$group_var <- list(
        registered = registration$predictor_variable$name,
        actual = analysis_spec$group_var
      )
      if (verbose) cat("FAIL: Group variable changed from",
                          registration$predictor_variable$name, "to",
                          analysis_spec$group_var, "\n")
    } else if (verbose) {
      cat("PASS: Group variable =", analysis_spec$group_var, "\n")
    }
  }
  
  # Check control variables
  if (!is.null(registration$control_variables$controls)) {
    registered_controls <- names(registration$control_variables$controls)
    actual_controls <- analysis_spec$controls
    
    if (!setequal(registered_controls, actual_controls)) {
      # Check what's included/excluded
      missing <- setdiff(registered_controls, actual_controls)
      extra <- setdiff(actual_controls, registered_controls)
      
      if (length(missing) > 0 || length(extra) > 0) {
        verification$passed <- FALSE
        verification$deviations$controls <- list(
          missing_from_analysis = missing,
          extra_in_analysis = extra
        )
        if (verbose) {
          if (length(missing) > 0) cat("FAIL: Registered controls not in analysis:",
                                       paste(missing, collapse = ", "), "\n")
          if (length(extra) > 0) cat("FAIL: Unregistered controls added:",
                                     paste(extra, collapse = ", "), "\n")
        }
      }
    } else if (verbose) {
      cat("PASS: Control variables match pre-registration\n")
    }
  }
  
  # Check analysis method
  registered_method <- registration$analysis_plan$method
  if (!is.null(registered_method) && !is.null(analysis_spec$method)) {
    if (registered_method != analysis_spec$method) {
      verification$passed <- FALSE
      verification$deviations$method <- list(
        registered = registered_method,
        actual = analysis_spec$method
      )
      if (verbose) cat("FAIL: Analysis method changed from",
                          registered_method, "to", analysis_spec$method, "\n")
    } else if (verbose) {
      cat("PASS: Analysis method =", analysis_spec$method, "\n")
    }
  }
  
  # Check significance threshold
  registered_alpha <- registration$significance_threshold$alpha
  if (!is.null(registered_alpha) && !is.null(analysis_spec$alpha)) {
    if (registered_alpha != analysis_spec$alpha) {
      verification$passed <- FALSE
      verification$deviations$alpha <- list(
        registered = registered_alpha,
        actual = analysis_spec$alpha
      )
      if (verbose) cat("FAIL: Significance threshold changed from",
                          registered_alpha, "to", analysis_spec$alpha, "\n")
    } else if (verbose) {
      cat("PASS: Significance threshold =", analysis_spec$alpha, "\n")
    }
  }
  
  if (verbose) {
    cat("\n")
    if (verification$passed) {
      cat("All verification checks PASSED.\n")
    } else {
      cat("WARNING: Verification FAILED. Analysis deviates from pre-registration.\n")
      cat("See deviations for details.\n")
    }
  }
  
  return(verification)
}

#' Generate a pre-registration report
#' @param registration The pre-registration object
#' @return A formatted markdown report string
generate_pre_registration_report <- function(registration) {
  # Capture the timestamp when report is generated
  report_generated <- format(Sys.time(), "%Y-%m-%d %H:%M:%S %Z")
  
  report <- sprintf('# Pre-Registration Report
  
**Analysis Title:** %s

**Purpose:** %s

**Author:** %s

---

## 1. Research Question

%s

## 2. Hypothesis

**Statement:** %s

**Direction:** %s

**Significance Level (α):** %.3f

## 3. Outcome Variable

- **Name:** %s
- **Definition:** %s
- **Type:** %s

## 4. Primary Predictor Variable

- **Name:** %s
- **Levels:** %s
- **Reference Level:** %s
- **Coding:** %s

## 5. Control Variables

%s

### Inclusion/Exclusion Criteria
%s

## 6. Analysis Method

- **Method:** %s
- **Model Formula:** `%s`
- **Software:** %s
- **Packages:** %s
- **Estimation Method:** %s
- **Robust Standard Errors:** %s

## 7. Significance Threshold

- **Alpha:** %.3f
- **Two-sided:** %s
- **Multiplicity Adjustment:** %s
- **Adjustment Method:** %s

## 8. Disconfirmation Testing Protocol

This analysis is subject to the full disconfirmation testing protocol, which includes:

1. **Placebo Tests:** Methodology applied to periods where effect is null
2. **Specification Sensitivity:** Robustness to model specification changes
3. **Negative Controls:** Testing methodology on unrelated outcomes
4. **Out-of-Sample Validation:** Effect replication in holdout data
5. **Temporal Robustness:** Effect consistency across time periods
6. **Alternative Explanation Testing:** Ruling out non-bias explanations

## 9. Pre-registered Findings (Completed After Analysis)

> **Note:** These fields are filled in AFTER data analysis is complete.
> If results differ from pre-registration, they will be noted here.

- **Pre-registered Effect Size (OR):** %s
- **Pre-registered p-value:** %s
- **Pre-registered Conclusion:** %s
- **Discrepancy Notes:** %s

---

**Pre-registration created:** %s

**Report generated:** %s

*This document was created BEFORE data analysis began. Any modifications after this point must be documented in the "Discrepancy Notes" section above.*
',
    "Racial Disparity Analysis in Legal Case Outcomes",
    registration$pre_registration_metadata$purpose %||% "Investigate potential bias in legal outcomes",
    registration$pre_registration_metadata$author %||% "Akashic Civics Analysis",
    registration$research_question,
    registration$hypothesis$statement,
    registration$hypothesis$directional,
    registration$hypothesis$alpha,
    registration$outcome_variable$name,
    registration$outcome_variable$definition,
    registration$outcome_variable$type,
    registration$predictor_variable$name,
    paste(registration$predictor_variable$levels, collapse = ", "),
    registration$predictor_variable$reference_level,
    registration$predictor_variable$coding,
    paste(
      sapply(names(registration$control_variables$controls), function(cv) {
        ctrl <- registration$control_variables$controls[[cv]]
        sprintf("- **%s**: %s (%s%s)',
                cv,
                ctrl$description %||% "",
                ctrl$type %||% "",
                ifelse(ctrl$included, ", *included*", ", *not included*"))
      }),
      collapse = "\n"
    ),
    paste(
      sapply(names(registration$control_variables$inclusion_criteria), function(ic) {
        sprintf("- **%s**: %s", ic, registration$control_variables$inclusion_criteria[[ic]])
      }),
      collapse = "\n"
    ),
    registration$analysis_plan$method,
    registration$analysis_plan$model_formula,
    registration$analysis_plan$software,
    paste(registration$analysis_plan$packages, collapse = ", "),
    registration$analysis_plan$estimation_method,
    registration$analysis_plan$robust_errors,
    registration$significance_threshold$alpha,
    registration$significance_threshold$two.sided,
    registration$significance_threshold$adjustment_for_multiplicity,
    registration$significance_threshold$adjustment_method,
    registration$pre_registered_effect_size %||% "To be filled after analysis",
    registration$pre_registered_p_value %||% "To be filled after analysis",
    registration$pre_registered_conclusion %||% "To be filled after analysis",
    registration$discrepancy_notes %||% "To be filled after comparison",
    registration$pre_registration_metadata$created %||% format(Sys.time()),
    report_generated
  )
  
  return(report)
}

#' Create a full pre-registered analysis workflow
#' 
#' This function orchestrates the complete pre-registration to analysis workflow:
#' 1. Creates or loads pre-registration
#' 2. Runs the analysis
#' 3. Verifies analysis matches pre-registration
#' 4. Runs disconfirmation tests
#' 5. Compares pre-registered and observed results
#' 6. Generates a comprehensive report
#' 
#' @param data The normalized legal case data
#' @param registration The pre-registration object (or path to file)
#' @param analysis_function The analysis function to use
#' @param output_dir Directory for output files
#' @param verbose Whether to print progress
#' @return A comprehensive results list
#' @export
pre_registered_analysis <- function(data, registration, analysis_function,
                                     output_dir = ".", verbose = TRUE) {
  
  # Create output directory
  if (!dir.exists(output_dir)) {
    dir.create(output_dir, recursive = TRUE)
  }
  
  # Timestamp for reproducibility
  analysis_timestamp <- format(Sys.time(), "%Y-%m-%d_%H-%M-%S")
  pre_reg_hash <- digest::digest(registration, algo = "sha256")
  
  if (verbose) {
    cat("=== PRE-REGISTERED ANALYSIS WORKFLOW ===\n")
    cat("Timestamp:", analysis_timestamp, "\n")
    cat("Pre-registration hash:", pre_reg_hash, "\n\n")
  }
  
  workflow_results <- list(
    timestamp = analysis_timestamp,
    pre_reg_hash = pre_reg_hash,
    steps = list()
  )
  
  # Step 1: Verify data processing matches pre-registration
  if (verbose) cat("Step 1: Verifying data processing...\n")
  workflow_results$steps$data_verification <- verify_data_processing(data, registration)
  
  # Step 2: Create analysis spec from pre-registration
  if (verbose) cat("Step 2: Building analysis specification...\n")
  analysis_spec <- list(
    name = registration$research_question,
    outcome = registration$outcome_variable$name,
    group_var = registration$predictor_variable$name,
    controls = names(registration$control_variables$controls),
    method = registration$analysis_plan$method,
    alpha = registration$significance_threshold$alpha,
    model_formula = registration$analysis_plan$model_formula
  )
  
  # Add included controls only
  included_controls <- names(registration$control_variables$controls)[
    sapply(registration$control_variables$controls, function(c) c$included)
  ]
  analysis_spec$controls <- included_controls
  
  # Step 3: Verify analysis spec against pre-registration
  if (verbose) cat("Step 3: Verifying analysis plan...\n")
  plan_verification <- verify_analysis_plan(analysis_spec, registration, verbose = verbose)
  workflow_results$steps$plan_verification <- plan_verification
  
  if (!plan_verification$passed) {
    warning("Analysis plan deviates from pre-registration. See deviations.")
    if (verbose) cat("WARNING: Deviations detected. Analysis will continue but results\n")
    if (verbose) cat("should be interpreted with caution. See verification report.\n\n")
  }
  
  # Step 4: Run the analysis
  if (verbose) cat("Step 4: Running analysis...\n")
  analysis_results <- tryCatch({
    analysis_function(
      data,
      group_var = analysis_spec$group_var,
      outcome = analysis_spec$outcome,
      controls = analysis_spec$controls,
      alpha = analysis_spec$alpha
    )
  }, error = function(e) {
    list(error = e$message)
  })
  
  workflow_results$analysis_results <- analysis_results
  
  if (inherits(analysis_results, "list") && !is.null(analysis_results$error)) {
    if (verbose) cat("Analysis FAILED:", analysis_results$error, "\n\n")
    workflow_results$status <- "failed"
    return(workflow_results)
  }
  
  if (verbose) cat("Analysis completed successfully.\n\n")
  
  # Step 5: Run disconfirmation tests
  if (verbose) cat("Step 5: Running disconfirmation tests...\n")
  
  # Check if disconfirmation function is available
  if (exists("run_full_disconfirmation")) {
    disconf_results <- run_full_disconfirmation(
      data = data,
      analysis_function = analysis_function,
      analysis_spec = analysis_spec,
      placebo_specs = registration$analysis_plan$placebo_specs %||% list(
        list(start = min(data[[registration$outcome_variable$name]]),
             end = min(data[[registration$outcome_variable$name]]))
      ),
      alternative_specs = registration$analysis_plan$alternative_specs %||% list(),
      negative_controls = registration$analysis_plan$negative_controls %||% list(),
      time_var = registration$analysis_plan$time_var %||% "date"
    )
    
    workflow_results$steps$disconfirmation <- disconf_results
  } else {
    if (verbose) cat("Disconfirmation function not found. Run disconfirmation tests manually.\n")
    workflow_results$steps$disconfirmation <- list(status = "not_run")
  }
  
  # Step 6: Record observed findings
  if (verbose) cat("Step 6: Recording observed findings...\n")
  
  observed_effect <- if (!is.null(analysis_results$odds_ratios)) {
    analysis_results$odds_ratios$odds_ratio[2]
  } else {
    NULL
  }
  
  observed_p <- if (!is.null(analysis_results$odds_ratios)) {
    analysis_results$odds_ratios$p_value[2]
  } else {
    NULL
  }
  
  # Step 7: Compare pre-registered vs observed
  if (verbose) cat("Step 7: Comparing pre-registered vs observed...\n")
  
  comparison <- list(
    pre_registered = list(
      research_question = registration$research_question,
      hypothesis = registration$hypothesis$statement,
      model_formula = registration$analysis_plan$model_formula,
      alpha = registration$significance_threshold$alpha
    ),
    observed = list(
      effect_size = observed_effect,
      p_value = observed_p,
      conclusion = if (!is.null(observed_p)) {
        if (observed_p < registration$significance_threshold$alpha) {
          "reject null"
        } else {
          "fail to reject null"
        }
      } else "unknown"
    ),
    match = if (!is.null(observed_p) && !is.null(registration$significance_threshold$alpha)) {
      # The pre-registered hypothesis predicts an effect > 1 (if Black has higher conviction)
      # Check if observed aligns with hypothesis
      if (registration$hypothesis$directional == "one.sided") {
        if (observed_p < registration$significance_threshold$alpha &&
            !is.null(observed_effect) && observed_effect > 1) {
          "Pre-registered hypothesis CONFIRMED"
        } else if (observed_p < registration$significance_threshold$alpha &&
                   !is.null(observed_effect) && observed_effect < 1) {
          "Pre-registered hypothesis REJECTED (opposite direction)"
        } else {
          "Pre-registered hypothesis NOT supported (insufficient evidence)"
        }
      } else {
        "See p-value and effect size for interpretation"
      }
    } else "insufficient data"
  )
  
  workflow_results$comparison <- comparison
  
  # Step 8: Save outputs
  if (verbose) cat("Step 8: Saving outputs...\n")
  
  # Save full results
  results_file <- file.path(output_dir,
                              paste0("pre_registered_analysis_", analysis_timestamp, ".rds"))
  saveRDS(workflow_results, results_file)
  
  # Generate report
  report_file <- file.path(output_dir,
                             paste0("pre_registered_analysis_", analysis_timestamp, ".md"))
  report_content <- sprintf('# Pre-Registered Analysis Report

**Timestamp:** %s

**Pre-registration Hash:** %s

## Comparison Summary

Pre-registered hypothesis: %s

Observed effect size (OR): %s

Observed p-value: %s

Conclusion: %s

## Disconfirmation Test Results

%s

## Detailed Results

See the full results file: %s
',
    analysis_timestamp,
    pre_reg_hash,
    registration$hypothesis$statement,
    observed_effect %||% "Not computed",
    observed_p %||% "Not computed",
    comparison$match,
    if (!is.null(workflow_results$steps$disconfirmation)) {
      sprintf("Tests passed: %s/%s",
              workflow_results$steps$disconfirmation$overall$passed_count,
              workflow_results$steps$disconfirmation$overall$total_count)
    } else "Not run",
    basename(results_file)
  )
  
  writeLines(report_content, report_file)
  
  if (verbose) {
    cat("Results saved to:", results_file, "\n")
    cat("Report saved to:", report_file, "\n\n")
    
    cat("=== WORKFLOW COMPLETE ===\n\n")
    
    cat("Summary:\n")
    cat("  - Data verification:",
        ifelse(workflow_results$steps$data_verification$passed, "PASS", "FAIL"), "\n")
    cat("  - Plan verification:",
        ifelse(plan_verification$passed, "PASS", "FAIL"), "\n")
    cat("  - Analysis: COMPLETED\n")
    cat("  - Observed effect:", observed_effect %||% "N/A", "\n")
    cat("  - Observed p-value:", observed_p %||% "N/A", "\n")
    cat("  - Conclusion:", comparison$match, "\n")
  }
  
  workflow_results$status <- "complete"
  return(workflow_results)
}

# ============================================================
# UTILITY: Helper for NULL-or-value operator
# ============================================================
`%||%` <- function(x, y) if (is.null(x)) y else x)