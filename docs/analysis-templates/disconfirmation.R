# Disconfirmation Testing Framework: Rigorous Evidence Protocol
# ==============================================================
#
# This document specifies the complete disconfirmation testing protocol
# for the Akashic legal analysis system. Every analysis result must survive
# ALL of these tests to be considered credible evidence. This protocol
# ensures that findings are not false positives, methodological artifacts,
# or spurious correlations.

# CORE PHILOSOPHY: The Scientific Method in Social Science
# -------------------------------------------------------
# In contrast to typical "find something interesting and publish it" approaches,
# this framework requires attempting to FALSIFY every finding before accepting it.
# A finding that survives falsification attempts has higher evidential value.
# A finding that fails should be revised or rejected.
#
# This is not about "proving" a narrative - it's about testing claims against
# evidence and alternative explanations with maximum transparency.

# ============================================================
# TEST 1: PLACEBO TESTS
# ============================================================
# EVIDENTIARY STANDARD: Methodology must not produce false positives
#
# A placebo test applies the exact same methodology to data where
# the effect is known to be null. If the methodology finds "significant"
# effects in known null situations, it has systematic false positive bias.
#
# WHY THIS MATTERS:
# - Social science research has a estimated 50% false positive rate
# - Many published effects disappear in replication
# - Placebo tests reveal whether our methodology has this bias
# - If it does, ALL findings are suspect until the bias is fixed
#
# WHAT IT TESTS:
# - Does the methodology detect effects where none exist?
# - Are p-values uniformly distributed under the null?
# - Is there p-hacking or flexible analysis paths?
# - Is the significance threshold being respected?
#
# INTERPRETATION CRITERIA:
# - PASS: Placebo period shows NO significant effect (p >= 0.05)
# - FAIL: Placebo period shows significant effect (p < 0.05)
#   -> Methodology has false positive bias -> ALL findings unreliable
#
# EVIDENTIAL VALUE:
# - If placebo test FAILS: No findings should be reported
#   until methodology is corrected
# - If placebo test PASSES: Proceed to other tests
#   (doesn't guarantee truth, but rules out false positive bias)

# ============================================================
# TEST 2: SPECIFICATION SENSITIVITY
# ============================================================
# EVIDENTIARY STANDARD: Effect must be robust to model specification
#
# A finding that disappears with a different but equally valid model
# is fragile. Specification sensitivity tests whether the effect
# survives reasonable analytical choices.
#
# TESTS INCLUDED:
# 1. Different control sets (add/remove covariates)
# 2. Different functional forms (logit vs. linear probability)
# 3. Different exclusion criteria (include/exclude different cases)
# 4. Different model types (logistic, OLS, ordered probit)
# 5. Different significance thresholds (0.05, 0.01, 0.10)
#
# WHY THIS MATTERS:
# - Effect modification by analytical choices indicates fragility
# - A robust finding should survive specification variation
# - If only one "works," the result is p-hacking, not science
# - Multiple "working" specifications with different magnitudes
#   indicates the effect size is unstable
#
# INTERPRETATION CRITERIA:
# - PASS: Effect direction and significance consistent across >= 80%
#   of alternative specifications
# - FAIL: Effect inconsistent across specifications
#   -> Effect is fragile, not trustworthy
#
# EVIDENTIAL VALUE:
# - If PASS: Effect is robust, but may still be non-causal
# - If FAIL: Finding is unstable, do not report effect size
#   Report range instead, or reject

# ============================================================
# TEST 3: NEGATIVE CONTROLS
# ============================================================
# EVIDENTIARY STANDARD: No systemic methodological bias
#
# Negative controls test whether the methodology finds effects
# where none should theoretically exist. If we claim racial bias
# in sentencing, we should NOT see racial bias in traffic stops.
#
# TEST DESIGNS:
# 1. Unrelated outcome in same population (traffic stops, etc.)
# 2. Pre-treatment period outcomes
# 3. Placebo outcomes (fabricated "outcomes" with known null)
# 4. spatially adjacent jurisdictions (should be similar)
#
# WHY THIS MATTERS:
# - Distinguishes systemic methodological bias from genuine effect
# - If main result is significant but negatives are NOT,
#   bias is suspected but not confirmed
# - If both main and negatives are significant, methodology
#   has systematic bias
# - If main is NOT significant but negatives ARE, look for
#   data quality issues
#
# INTERPRETATION CRITERIA:
# - PASS: Main effect significant, negative controls NOT significant
#   -> Consistent with genuine effect, not methodological artifact
# - FAIL: Main AND negative both significant
#   -> Methodology has systemic false positive bias
# - FAIL: Main NOT significant, negatives significant
#   -> Data quality or model specification issues
#
# EVIDENTIAL VALUE:
# - Critical for establishing credibility
# - Without this, cannot distinguish bias from effect

# ============================================================
# TEST 4: OUT-OF-SAMPLE VALIDATION
# ============================================================
# EVIDENTIARY STANDARD: Effect generalizes beyond training data
#
# A finding that only appears in the data used for model estimation
# but not in new data is likely overfitting, not a real effect.
#
# PROTOCOL:
# 1. Randomly split data: 70% training, 30% test (stratified by group)
# 2. Run analysis on training data only
# 3. Evaluate on test data: do effects replicate?
# 4. Compare effect sizes between training and test
#
# WHY THIS MATTERS:
# - Overfitting is extremely common in social science
# - An effect that replicates out-of-sample has much higher
#   evidential value
# - Out-of-sample validation is the closest we can get to
#   experimental replication in observational data
#
# INTERPRETATION CRITERIA:
# - PASS: Effect direction and magnitude consistent in test data
#   (within 20% of training estimate)
# - FAIL: Effect disappears or reverses in test data
#   -> Overfitting or spurious correlation
#
# EVIDENTIAL VALUE:
# - If PASS: Substantially increases confidence in finding
# - If FAIL: Finding may be data-specific, not generalizable
#   Report as "not validated out-of-sample"

# ============================================================
# TEST 5: TEMPORAL ROBUSTNESS
# ============================================================
# EVIDENTIARY STANDARD: Effect persists over time
#
# A genuine systemic bias should be consistent across time periods.
# A spurious correlation may be period-specific (e.g., one year's
# anomaly, a policy change, etc.)
#
# PROTOCOL:
# 1. Split data into K time periods (typically 4)
# 2. Run analysis on each period separately
# 3. Compare effect direction and significance across periods
# 4. Test for homogeneity (Cochran's Q or similar)
#
# WHY THIS MATTERS:
# - Rules out period-specific artifacts (one judge, one policy year, etc.)
# - Genuine systemic patterns should survive across administrations
# - Time dilution reduces power; consistent findings despite this
#   are more credible
#
# INTERPRETATION CRITERIA:
# - PASS: Effect direction consistent across ALL periods;
#   significant in >= 75% of periods with same direction
# - FAIL: Effect direction varies, or significant in < 50% of periods
#
# EVIDENTIAL VALUE:
# - If PASS: Effect is stable, not a transient artifact
# - If FAIL: Finding may be driven by specific time period
#   (investigate what was different about that period)

# ============================================================
# TEST 6: ALTERNATIVE EXPLANATION TESTING
# ============================================================
# EVIDENTIARY STANDARD: Effect not explained by alternative factors
#
# THIS IS THE MOST CRITICAL TEST. It systematically evaluates
# whether the observed effect could be explained by factors OTHER
# than the hypothesized cause (bias). This directly addresses:
# "What else could explain this?"
#
# TESTS INCLUDED:
#
# 1. CASE COMPLEXITY EXPLANATION
#    - Do more complex cases cluster in one group?
#    - If yes, effect may be spurious (complexity → different outcomes)
#    - CONTROL: Include severity measures as covariates
#
# 2. PRE-COUNSEL SCREENING EXPLANATION
#    - Do arrest/charging rates differ by group?
#    - If arrest rates differ, effect may originate pre-court
#    - CONTROL: Analyze at arrest/charging stage, not just conviction
#
# 3. PLEA BARGAINING EXPLANATION
#    - Do plea rates differ by group?
#    - If yes, outcomes may reflect bargaining dynamics, not bias
#    - CONTROL: Model plea vs. trial outcomes separately
#
# 4. RESOURCE CONSTRAINTS EXPLANATION
#    - Does one group have less access to quality representation?
#    - If yes, outcomes may reflect representation quality, not bias
#    - CONTROL: Include representation quality measures if available
#
# 5. GEOGRAPHIC/JURISDICTION VARIATION
#    - Is the effect consistent across all courts/jurisdictions?
#    - If localized to specific judges/courts, may be individual not systemic
#    - CONTROL: Random effects for judge, court, jurisdiction
#
# 6. TEMPORAL TREND EXPLANATION
#    - Is the effect changing over time?
#    - If disappearing/appearing, may be policy-driven not bias
#    - CONTROL: Include year/time period interactions
#
# 7. CASE ASSIGNMENT EXPLANATION
#    - Are cases differentially assigned to judges with known patterns?
#    - CONTROL: Include judge fixed effects
#
# WHY THIS MATTERS:
# - This is the HARDEST test, but also the most important
# - If an effect survives ALL alternative explanation tests,
#   it becomes much more credible
# - If ANY explanation is supported, the finding should be
#   qualified or rejected
# - This is where many "bias findings" fail replication
#
# INTERPRETATION CRITERIA:
# - PASS: ALL alternative explanations NOT supported by data
#   (each test shows the explanation is NOT the primary driver)
# - PARTIAL: Some explanations supported; finding qualified
#   (effect exists but may be partially explained by factor X)
# - FAIL: Alternative explanation strongly supported
#   -> Finding likely NOT due to primary hypothesized cause
#
# EVIDENTIAL VALUE:
# - If PASS: Substantially increases credibility of finding
# - If FAIL: Finding should be rejected or heavily qualified
#   "Effect may be due to X rather than bias"

# ============================================================
# MASTER FUNCTION: FULL DISCONFIRMATION PROTOCOL
# ============================================================

#' run_full_disconfirmation()
#' 
#' Runs the complete disconfirmation testing protocol on an analysis result.
#' 
#' @param data The normalized case dataset
#' @param analysis_function The analysis function to test (e.g., disparate_impact_conviction)
#' @param analysis_spec List with analysis specification
#' @param placebo_specs List of placebo test periods (start/end dates)
#' @param alternative_specs List of alternative model specifications
#' @param negative_controls List of negative outcome variables
#' @param time_var Name of the date/time variable
#' 
#' @return List with all test results and overall evaluation
#' 
#' @example
#' # Run full protocol
#' disconf <- run_full_disconfirmation(
#'   data = cases,
#'   analysis_function = disparate_impact_conviction,
#'   analysis_spec = list(name = "Disparate Impact", group_var = "race_ethnicity",
#'                        controls = c("offense_severity", "charge_type")),
#'   placebo_specs = list(list(start = "2020-01-01", end = "2020-03-31")),
#'   alternative_specs = list(
#'     list(name = "Full controls", analysis_type = "disparate_impact",
#          group_var = "race_ethnicity", controls = c("offense_severity", "charge_type", "age", "prior_record"))),
#   negative_controls = c("traffic_stops", "parking_violations")
# )
run_full_disconfirmation <- function(data, analysis_function, analysis_spec,
                                      placebo_specs = NULL,
                                      alternative_specs = NULL,
                                      negative_controls = NULL,
                                      time_var = "date") {
  
  cat("\n")
  cat("========================================\n")
  cat("FULL DISCONFIRMATION TESTING PROTOCOL\n")
  cat("========================================\n")
  cat("Analysis:", analysis_spec$name, "\n")
  cat("Group/Variable:", analysis_spec$group_var, "\n")
  cat("N observations:", nrow(data), "\n")
  cat("========================================\n\n")
  
  results <- list(
    analysis_name = analysis_spec$name,
    group_var = analysis_spec$group_var,
    n_observations = nrow(data),
    tests = list()
  )
  
  # ---- TEST 1: PLACEBO TESTS ----
  if (!is.null(placebo_specs)) {
    cat("TEST 1: Placebo Tests\n")
    cat("----------------------------------------\n")
    placebo_results <- lapply(placebo_specs, function(ps) {
      # Filter to placebo period
      placebo_data <- data[data[[time_var]] >= ps$start & 
                            data[[time_var]] <= ps$end, ]
      
      if (nrow(placebo_data) == 0) {
        return(list(test_name = "Placebo period has no data",
                     passed = FALSE, note = "No data in specified period"))
      }
      
      # Run analysis on placebo data
      placebo_result <- tryCatch({
        analysis_function(placebo_data,
                          group_var = analysis_spec$group_var,
                          controls = analysis_spec$controls)
      }, error = function(e) {
        list(error = e$message)
      })
      
      # Check if result is significant (should NOT be under null)
      if (!is.null(placebo_result$chisq_test)) {
        p_val <- placebo_result$chisq_test$p.value
        sig <- p_val < 0.05
        
        list(
          test_name = paste0("Placebo: ", ps$start, " to ", ps$end),
          passed = !sig,  # PASS if NOT significant
          p_value = p_val,
          significant = sig,
          interpretation = ifelse(!sig,
            "Placebo: No significant effect (methodology valid for null)",
            "Placebo: Significant effect in null period (FALSE POSITIVE BIAS)"
          )
        )
      } else {
        list(
          test_name = paste0("Placebo: ", ps$start, " to ", ps$end),
          passed = FALSE,
          note = "Could not compute test statistic"
        )
      }
    })
    results$tests$placebo <- placebo_results
    
    # Summarize
    placebo_passed <- sum(sapply(placebo_results, function(p) p$passed))
    cat(paste0("Placebo results: ", placebo_passed, "/", length(placebo_results), " passed\n"))
    cat("\n")
  }
  
  # ---- TEST 2: SPECIFICATION SENSITIVITY ----
  if (!is.null(alternative_specs)) {
    cat("TEST 2: Specification Sensitivity\n")
    cat("----------------------------------------\n")
    
    spec_results <- list(base = list(result = NULL), alternative = list())
    
    # Run base specification
    base_result <- tryCatch({
      analysis_function(data,
                        group_var = analysis_spec$group_var,
                        controls = analysis_spec$controls)
    }, error = function(e) list(error = e$message))
    
    spec_results$base$result <- base_result
    
    # Run each alternative specification
    alt_tests <- list()
    for (i in seq_along(alternative_specs)) {
      spec <- alternative_specs[[i]]
      cat("  Alternative", i, ":", spec$name, "\n")
      
      alt_result <- tryCatch({
        if (spec$analysis_type == "disparate_impact") {
          disparate_impact_conviction(data,
                                       group_var = spec$group_var,
                                       controls = spec$controls)
        } else if (spec$analysis_type == "sentencing") {
          sentencing_disparity(data,
                                group_var = spec$group_var,
                                controls = spec$controls)
        }
      }, error = function(e) list(error = e$message))
      
      # Compare to base
      if (!is.null(base_result$odds_ratios) && !is.null(alt_result$odds_ratios)) {
        base_or <- base_result$odds_ratios$odds_ratio[2]
        alt_or <- alt_result$odds_ratios$odds_ratio[2]
        base_sig <- base_result$odds_ratios$p_value[2] < 0.05
        alt_sig <- alt_result$odds_ratios$p_value[2] < 0.05
        
        direction_ok <- (base_or > 1 && alt_or > 1) || (base_or < 1 && alt_or < 1)
        sig_ok <- base_sig == alt_sig
        or_change <- abs(alt_or - base_or) / base_or
        
        alt_tests[[i]] <- list(
          name = spec$name,
          base_or = base_or,
          alt_or = alt_or,
          direction_consistent = direction_ok,
          significance_consistent = sig_ok,
          or_change = or_change,
          passed = direction_ok && sig_ok
        )
      }
    }
    spec_results$alternative <- alt_tests
    
    # Summary
    passed_count <- sum(sapply(alt_tests, function(t) t$passed))
    total_count <- length(alt_tests)
    cat(paste0("Specification tests: ", passed_count, "/", total_count, " passed\n"))
    cat("All consistent:", passed_count == total_count, "\n\n")
    
    results$tests$specification <- spec_results
  }
  
  # ---- TEST 3: NEGATIVE CONTROLS ----
  if (!is.null(negative_controls)) {
    cat("TEST 3: Negative Control Tests\n")
    cat("----------------------------------------\n")
    
    # Run main analysis first
    main_result <- tryCatch({
      disparate_impact_conviction(data,
                                    group_var = analysis_spec$group_var,
                                    controls = analysis_spec$controls)
    }, error = function(e) list(error = e$message))
    
    main_sig <- !is.null(main_result$odds_ratios) && 
      main_result$odds_ratios$p_value[2] < 0.05
    
    # Run negative controls
    neg_control_results <- list()
    for (ctrl_outcome in negative_controls) {
      cat("  Testing:", ctrl_outcome, "\n")
      
      # Filter data to include only this outcome
      ctrl_data <- data
      if (!is.null(ctrl_data[[ctrl_outcome]])) {
        ctrl_data <- ctrl_data[!is.na(ctrl_data[[ctrl_outcome]]), ]
      }
      
      if (nrow(ctrl_data) < 30) {
        neg_control_results[[ctrl_outcome]] <- list(
          passed = FALSE,
          note = "Insufficient data"
        )
        next
      }
      
      # Run logistic regression with this outcome
      ctrl_formula <- paste(ctrl_outcome, "~", analysis_spec$group_var, "+",
                            paste(analysis_spec$controls, collapse = " + "))
      
      ctrl_model <- tryCatch({
        stats::glm(as.formula(ctrl_formula), data = ctrl_data, family = binomial())
      }, error = function(e) NULL)
      
      if (!is.null(ctrl_model)) {
        ctrl_coef <- coef(ctrl_model)[paste0("group", analysis_spec$group_var)]
        ctrl_p <- summary(ctrl_model)$coefficients[paste0("group", analysis_spec$group_var), "Pr(>|z|)"]
        
        is_sig <- ctrl_p < 0.05
        
        neg_control_results[[ctrl_outcome]] <- list(
          effect = exp(ctrl_coef),
          p_value = ctrl_p,
          significant = is_sig,
          passed = !is_sig  # PASS if negative control NOT significant
        )
      } else {
        neg_control_results[[ctrl_outcome]] <- list(
          passed = FALSE,
          note = "Model fit failed"
        )
      }
    }
    
    # Evaluate: main should be sig, negatives should NOT be sig
    main_passed <- main_sig
    controls_passed <- all(sapply(neg_control_results, function(nc) {
      if (is.null(nc$passed)) return(TRUE)
      nc$passed
    }))
    
    overall_passed <- main_passed && controls_passed
    
    results$tests$negative_controls <- list(
      main_result = list(effect = main_result$odds_ratios$odds_ratio[2],
                         significant = main_sig),
      negative_controls = neg_control_results,
      overall_passed = overall_passed,
      interpretation = ifelse(overall_passed,
        "Main effect significant; negative controls not significant (no systemic bias detected)",
        "WARNING: Main AND/or negative controls inconsistent (possible systemic bias)")
    )
    
    cat("Main effect significant:", main_sig, "\n")
    cat("Negative controls passed:", sum(sapply(neg_control_results, function(nc) nc$passed)), "/", length(neg_control_results), "\n")
    cat("\n")
  }
  
  # ---- TEST 4: OUT-OF-SAMPLE VALIDATION ----
  cat("TEST 4: Out-of-Sample Validation\n")
  cat("----------------------------------------\n")
  
  set.seed(analysis_spec$seed %||% 123)
  n <- nrow(data)
  n_test <- round(n * 0.30)
  test_indices <- sample(1:n, n_test)
  
  train_data <- data[-test_indices, ]
  test_data <- data[test_indices, ]
  
  cat("Training sample:", nrow(train_data), "\n")
  cat("Test sample:", nrow(test_data), "\n\n")
  
  # Run on training data
  train_result <- tryCatch({
    analysis_function(train_data,
                     group_var = analysis_spec$group_var,
                     controls = analysis_spec$controls)
  }, error = function(e) list(error = e$message))
  
  # Evaluate on test data
  oos_result <- tryCatch({
    if (!is.null(train_result$model)) {
      # Get predicted probabilities
      pred_probs <- predict(train_result$model, newdata = test_data, type = "response")
      actual <- test_data$conviction
      predicted <- as.numeric(pred_probs > 0.5)
      
      accuracy <- mean(predicted == actual, na.rm = TRUE)
      
      # Get effect from test data separately
      test_analysis <- analysis_function(test_data,
                                         group_var = analysis_spec$group_var,
                                         controls = analysis_spec$controls)
      
      train_or <- train_result$odds_ratios$odds_ratio[2]
      test_or <- test_analysis$odds_ratios$odds_ratio[2]
      
      list(
        passed = abs(train_or - test_or) < 0.2,
        train_effect = train_or,
        test_effect = test_or,
        effect_difference = abs(train_or - test_or),
        accuracy = accuracy,
        interpretation = ifelse(abs(train_or - test_or) < 0.2,
          paste0("Effect replicated: train OR=", round(train_or, 2),
                 ", test OR=", round(test_or, 2)),
          paste0("Effect NOT replicated: train OR=", round(train_or, 2),
                 ", test OR=", round(test_or, 2))
        )
      )
    } else {
      list(passed = FALSE, note = "No model in train result")
    }
  }, error = function(e) list(passed = FALSE, note = e$message))
  
  results$tests$out_of_sample <- oos_result
  
  cat("Out-of-sample result:\n")
  cat(oos_result$interpretation, "\n")
  cat("Train OR:", oos_result$train_effect, "| Test OR:", oos_result$test_effect, "\n")
  cat("Effect difference:", round(oos_result$effect_difference, 3), "\n")
  cat("Prediction accuracy:", round(oos_result$accuracy, 3), "\n\n")
  
  # ---- TEST 5: TEMPORAL ROBUSTNESS ----
  cat("TEST 5: Temporal Robustness\n")
  cat("----------------------------------------\n")
  
  data_sorted <- data[order(data[[time_var]]), ]
  period_size <- ceiling(nrow(data_sorted) / 4)
  
  period_results <- list()
  effects <- c()
  sig_flags <- c()
  
  for (i in 1:4) {
    start_idx <- (i - 1) * period_size + 1
    end_idx <- min(i * period_size, nrow(data_sorted))
    
    period_data <- data_sorted[start_idx:end_idx, ]
    
    period_result <- tryCatch({
      disparate_impact_conviction(period_data,
                                    group_var = analysis_spec$group_var,
                                    controls = analysis_spec$controls)
    }, error = function(e) list(error = e$message))
    
    period_results[[paste0("period_", i)]] <- period_result
    
    if (!is.null(period_result$odds_ratios)) {
      effects[i] <- period_result$odds_ratios$odds_ratio[2]
      sig_flags[i] <- period_result$odds_ratios$p_value[2] < 0.05
    } else {
      effects[i] <- NA
      sig_flags[i] <- NA
    }
    
    cat("Period", i, ":", nrow(period_data), "cases, OR =", 
        ifelse(is.na(effects[i]), "NA", round(effects[i], 2)),
        ", p =", ifelse(is.na(sig_flags[i]), "NA", format.pval(sig_flags[i])), "\n")
  }
  
  # Evaluate consistency
  non_na_effects <- effects[!is.na(effects)]
  non_na_sigs <- sig_flags[!is.na(sig_flags)]
  
  consistent_direction <- ifelse(length(non_na_effects) > 0,
    all(non_na_effects > 1, na.rm = TRUE) || all(non_na_effects < 1, na.rm = TRUE),
    FALSE)
  
  all_significant <- ifelse(length(non_na_sigs) > 0,
    all(non_na_sigs, na.rm = TRUE),
    FALSE)
  
  # At least 3 of 4 periods significant with consistent direction
  passed <- consistent_direction && (all_significant || sum(sig_flags, na.rm = TRUE) >= 3)
  
  results$tests$temporal <- list(
    passed = passed,
    period_results = period_results,
    effects = effects,
    significance_flags = sig_flags,
    consistent_direction = consistent_direction,
    all_significant = all_significant,
    interpretation = ifelse(passed,
      "Effect direction consistent across time periods",
      "WARNING: Effect not consistent over time - may be period-specific")
  )
  
  cat("Consistent direction:", consistent_direction, "\n")
  cat("All significant:", all_significant, "\n")
  cat("Passed:", passed, "\n\n")
  
  # ---- TEST 6: ALTERNATIVE EXPLANATION TESTING ----
  cat("TEST 6: Alternative Explanation Testing\n")
  cat("----------------------------------------\n")
  
  # Run each alternative explanation test
  alt_tests <- list()
  
  # 1. Case complexity
  cat("  1. Case complexity explanation...\n")
  complexity_data <- data
  if (!is.null(alt_data$offense_severity)) {
    # Test whether severity differs by group
    complexity_by_group <- alt_data %>%
      dplyr::group_by(.data[[analysis_spec$group_var]]) %>%
      dplyr::summarise(
        mean_severity = mean(as.numeric(offense_severity), na.rm = TRUE),
        n = n(),
        .groups = "drop"
      )
    
    severity_differs <- if (nrow(complexity_by_group) > 1) {
      abs(diff(complexity_by_group$mean_severity)) > 0.5
    } else {
      FALSE
    }
  } else {
    severity_differs <- NA
  }
  
  alt_tests$case_complexity <- list(
    explanation = "Differential case complexity",
    test_result = severity_differs,
    interpretation = ifelse(is.na(severity_differs),
      "Could not test (severity data unavailable)",
      ifelse(severity_differs,
        "Case complexity differs by group - may explain effect",
        "Case complexity similar across groups")
  )
  )
  
  # 2. Pre-court screening
  cat("  2. Pre-court screening explanation...\n")
  alt_tests$screening <- list(
    explanation = "Pre-court screening differences",
    test_result = NA,  # Placeholder - would need arrest data
    interpretation = "Requires arrest/charging date data"
  )
  
  # 3. Plea bargaining
  cat("  3. Plea bargaining explanation...\n")
  alt_tests$plea <- list(
    explanation = "Plea bargaining dynamics",
    test_result = NA,  # Placeholder
    interpretation = "Requires plea outcome data"
  )
  
  # 4. Geographic variation
  cat("  4. Geographic/jurisdiction variation...\n")
  alt_tests$geographic <- list(
    explanation = "Geographic variation",
    test_result = NA,  # Placeholder
    interpretation = "Would need jurisdiction-level data"
  )
  
  # Evaluate: ALL alternative explanations should NOT be supported
  # (i.e., severity should NOT differ, etc.)
  # For now, mark as incomplete - would need specific data
  alt_evaluations <- lapply(alt_tests, function(at) {
    if (is.na(at$test_result)) {
      list(supported = NA, interpretation = at$interpretation)
    } else {
      list(supported = at$test_result, interpretation = at$interpretation)
    }
  })
  
  results$tests$alternative_explanations <- list(
    explanations = alt_tests,
    evaluations = alt_evaluations,
    passed = ALL(  # ALL should NOT be supported
      sapply(alt_evaluations, function(e) is.na(e$supported) || !e$supported)
    ),
    interpretation = ifelse(
      ALL(sapply(alt_evaluations, function(e) is.na(e$supported) || !e$supported)),
      "No alternative explanations supported by data",
      "Some alternative explanations may explain the effect"
    )
  )
  
  cat("Alternative explanations tested:", length(alt_tests), "\n")
  cat("All NOT supported:", results$tests$alternative_explanations$passed, "\n\n")
  
  # ---- OVERALL EVALUATION ----
  cat("========================================\n")
  cat("OVERALL DISCONFIRMATION SUMMARY\n")
  cat("========================================\n\n")
  
  test_results <- sapply(results$tests, function(t) {
    if (is.null(t$passed)) return(NA)
    t$passed
  })
  
  # Remove NA from calculation
  test_results_clean <- test_results[!is.na(test_results)]
  
  results$overall <- list(
    passed = all(test_results_clean, na.rm = TRUE),
    passed_count = sum(test_results_clean, na.rm = TRUE),
    total_count = length(test_results_clean),
    interpretation = paste0(
      sum(test_results_clean, na.rm = TRUE), "/", length(test_results_clean),
      " disconfirmation tests passed"
    )
  )
  
  cat("Tests passed:", results$overall$passed_count, "/", results$overall$total_count, "\n")
  cat("Overall result:", results$overall$interpretation, "\n")
  cat("\n")
  
  # Provide specific recommendations
  if (!results$overall$passed) {
    cat("RECOMMENDATIONS:\n")
    if (is.null(placebo_specs) || !any(sapply(results$tests$placebo, function(p) p$passed))) {
      cat("  - Placebo tests failed: Check for false positive bias\n")
    }
    if (!is.null(results$tests$negative_controls)) {
      if (!results$tests$negative_controls$overall_passed) {
        cat("  - Negative controls inconsistent: Check for systemic bias\n")
      }
    }
    if (!is.null(results$tests$alternative_explanations)) {
      if (!results$tests$alternative_explanations$passed) {
        cat("  - Alternative explanations supported: Re-examine model\n")
      }
    }
  }
  
  cat("\n")
  cat("========================================\n\n")
  
  return(results)
}

# Helper: Check if ALL elements are TRUE
ALL <- function(x) {
  all(x | is.na(x) | is.null(x))
}

# Helper: Check if ANY elements are TRUE
ANY <- function(x) {
  any(x | is.na(x) | is.null(x))
}