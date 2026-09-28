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
cat "p-hacking.\n")