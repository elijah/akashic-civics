# Disconfirmation Testing Framework
# ==================================
#
# This framework implements systematic attempts to disprove findings.
# Every significant result is subjected to falsification tests.
# If the finding survives, confidence increases. If it fails, the finding
# is revised or rejected. This is the scientific method applied to social analysis.
#
# Usage:
#   source("disconfirmation.R")
#   result <- run_full_disconfirmation(analysis_result, data, analysis_spec)
#   print(result$robustness_summary)
#   report_findings(result)

# ============================================================
# CORE PRINCIPLE: FALSIFIABILITY
# ============================================================
#
# A finding is only credible if it can withstand attempts to disprove it.
# This framework tests findings against:
# 1. Placebo tests (do effects appear where they shouldn't?)
# 2. Specification sensitivity (do results change with different models?)
# 3. Negative controls (do known null effects appear significant?)
# 4. Out-of-sample validation (do findings generalize?)
# 5. Temporal robustness (do patterns persist over time?)
# 6. Alternative explanations (can we explain results without bias?)
#
# If a finding fails ANY disconfirmation test, it should be:
# - Revised with caveats
# - Re-examined for methodological errors
# - Considered inconclusive
#
# ============================================================

# ============================================================
# TEST 1: PLACEBO TESTS
# ============================================================
# Placebo tests apply the methodology to a situation where we know
# the result should be null. If the methodology finds "significant"
# effects in known null situations, it has false positive bias.
#
# Example: If we claim racial bias in sentencing, apply the same
# methodology to a period before the alleged discrimination occurred.
# The effect should be null. If it's not, our methodology has
# systematic false positives.

placebo_test <- function(data, analysis_function, analysis_spec,
                         placebo_period_start, placebo_period_end) {
  
  cat("\n=== PLACEBO TEST ===\n")
  cat("Period:", placebo_period_start, "to", placebo_period_end, "\n")
  
  # Filter to placebo period
  placebo_data <- data[data$date >= placebo_period_start & 
                        data$date <= placebo_period_end, ]
  
  if (nrow(placebo_data) == 0) {
    return(list(
      test_name = "Placebo test",
      passed = FALSE,
      note = "No data in placebo period"
    ))
  }
  
  # Run analysis on placebo period
  placebo_result <- tryCatch({
    analysis_function(placebo_data, 
                      group_var = analysis_spec$group_var,
                      controls = analysis_spec$controls)
  }, error = function(e) {
    return(list(error = e$message, passed = FALSE))
  })
  
  # Check if placebo result is "significant" (should be null)
  if (!is.null(placebo_result$chisq_test)) {
    placebo_p <- placebo_result$chisq_test$p.value
    placebo_significant <- placebo_p < 0.05
    
    passed <- !placebo_significant
    
    return(list(
      test_name = "Placebo test",
      passed = passed,
      p_value = placebo_p,
      significant = placebo_significant,
      interpretation = ifelse(passed,
        paste0("Placebo period shows no significant effect (p=", round(placebo_p, 3), 
               ") - methodology appears valid"),
        paste0("WARNING: Placebo period shows significant effect (p=", round(placebo_p, 3), 
               ") - methodology may have systematic false positive bias")
      )
    ))
  } else {
    return(list(
      test_name = "Placebo test",
      passed = FALSE,
      note = "Could not run placebo test"
    ))
  }
}

# ============================================================
# TEST 2: SPECIFICATION SENSITIVITY
# ============================================================
# Specification sensitivity tests whether results are robust to
# different model specifications. If the effect disappears with
# a different but equally valid model, the finding is fragile.
#
# Tests include:
# - Different control sets
# - Different functional forms
# - Different exclusion criteria
# - Different model types (logistic vs. linear vs. ordered probit)

specification_sensitivity <- function(data, base_spec, alternative_specs) {
  
  cat("\n=== SPECIFICATION SENSITIVITY ===\n")
  
  results <- list(
    base = base_spec,
    alternative_specs = alternative_specs,
    tests = list()
  )
  
  for (i in seq_along(alternative_specs)) {
    spec <- alternative_specs[[i]]
    
    cat("Testing alternative specification:", spec$name, "\n")
    
    alt_result <- tryCatch({
      # Run analysis with alternative specification
      if (spec$analysis_type == "disparate_impact") {
        disparate_impact_conviction(data, 
                                     group_var = spec$group_var,
                                     controls = spec$controls)
      } else if (spec$analysis_type == "sentencing") {
        sentencing_disparity(data,
                              group_var = spec$group_var,
                              controls = spec$controls)
      }
    }, error = function(e) {
      return(list(error = e$message))
    })
    
    # Compare to base result
    if (!is.null(alt_result$odds_ratios) && !is.null(base_result$odds_ratios)) {
      # Check if direction and significance are consistent
      base_or <- base_result$odds_ratios$odds_ratio[2]
      alt_or <- alt_result$odds_ratios$odds_ratio[2]
      
      base_sig <- base_result$odds_ratios$p_value[2] < 0.05
      alt_sig <- alt_result$odds_ratios$p_value[2] < 0.05
      
      direction_consistent <- (base_or > 1 && alt_or > 1) || (base_or < 1 && alt_or < 1)
      significance_consistent <- base_sig == alt_sig
      
      results$tests[[spec$name]] <- list(
        base_or = base_or,
        alt_or = alt_or,
        base_significant = base_sig,
        alt_significant = alt_sig,
        direction_consistent = direction_consistent,
        significance_consistent = significance_consistent,
        passed = direction_consistent && significance_consistent,
        or_change = abs(alt_or - base_or) / base_or
      )
    }
  }
  
  # Summary
  passed_count <- sum(sapply(results$tests, function(t) t$passed))
  total_count <- length(results$tests)
  
  results$summary <- list(
    passed = passed_count,
    total = total_count,
    all_passed = passed_count == total_count,
    interpretation = paste0(
      passed_count, "/", total_count, " alternative specifications ",
      "yield consistent results"
    )
  )
  
  return(results)
}

# ============================================================
# TEST 3: NEGATIVE CONTROLS
# ============================================================
# Negative control outcomes test whether the methodology finds
# effects where none should exist. If we claim racial bias in
# sentencing, we should NOT see racial bias in traffic stops
# (a theoretically unrelated outcome).
#
# This tests for systemic methodological bias vs. genuine effect.

negative_control_test <- function(data, main_outcome, negative_control_outcomes,
                                  group_var, controls) {
  
  cat("\n=== NEGATIVE CONTROL TESTS ===\n")
  
  results <- list(
    main_outcome = main_outcome,
    negative_controls = list()
  )
  
  # Run main analysis
  main_result <- disparate_impact_conviction(data, 
                                               group_var = group_var,
                                               controls = controls)
  
  main_effect <- main_result$odds_ratios$odds_ratio[2]
  main_significant <- main_result$odds_ratios$p_value[2] < 0.05
  
  results$main_result <- list(
    effect = main_effect,
    significant = main_significant
  )
  
  # Run negative control analyses
  for (control_outcome in negative_control_outcomes) {
    cat("Testing negative control outcome:", control_outcome, "\n")
    
    # Filter to cases with this outcome
    control_data <- data[!is.na(data[[control_outcome]]), ]
    
    if (nrow(control_data) < 30) {
      results$negative_controls[[control_outcome]] <- list(
        passed = FALSE,
        note = "Insufficient data for control test"
      )
      next
    }
    
    # Run analysis with negative control outcome
    # (Implementation depends on outcome type)
    control_result <- tryCatch({
      # For binary outcomes, use logistic regression
      if (is.factor(control_data[[control_outcome]]) && 
          nlevels(control_data[[control_outcome]]) == 2) {
        
        formula_str <- paste(control_outcome, "~", group_var, "+",
                              paste(controls, collapse = " + "))
        model <- stats::glm(formula_str, data = control_data, family = binomial())
        
        group_coef <- coef(model)[paste0("group", group_var)]
        group_p <- summary(model)$coefficients[paste0("group", group_var), "Pr(>|z|)"]
        
        list(
          effect = exp(group_coef),
          p_value = group_p,
          significant = group_p < 0.05
        )
      } else {
        # For continuous outcomes, use linear regression
        formula_str <- paste(control_outcome, "~", group_var, "+",
                              paste(controls, collapse = " + "))
        model <- stats::lm(formula_str, data = control_data)
        
        group_coef <- coef(model)[paste0("group", group_var)]
        group_p <- summary(model)$coefficients[paste0("group", group_var), "Pr(>|t|)"]
        
        list(
          effect = group_coef,
          p_value = group_p,
          significant = group_p < 0.05
        )
      }
    }, error = function(e) {
      list(error = e$message, passed = FALSE)
    })
    
    results$negative_controls[[control_outcome]] <- control_result
  }
  
  # Evaluate: main effect should be significant, controls should not be
  main_passed <- main_significant
  controls_passed <- all(sapply(results$negative_controls, function(nc) {
    if (is.null(nc$significant)) return(TRUE)
    !nc$significant  # Controls should NOT be significant
  }))
  
  results$passed <- main_passed && controls_passed
  results$interpretation <- ifelse(results$passed,
    paste0("Main effect is significant (consistent with hypothesis), ",
           "negative controls are not significant (no systemic bias)"),
    paste0("WARNING: Main effect or negative controls inconsistent - ",
           "methodology may have systematic bias")
  )
  
  return(results)
}

# ============================================================
# TEST 4: OUT-OF-SAMPLE VALIDATION
# ============================================================
# Out-of-sample validation tests whether findings generalize to
# data not used in model estimation. If an effect only appears
# in the training data but not in held-out data, it may be overfitting.

out_of_sample_validation <- function(data, analysis_function, 
                                      analysis_spec, test_fraction = 0.3) {
  
  cat("\n=== OUT-OF-SAMPLE VALIDATION ===\n")
  
  set.seed(analysis_spec$seed %||% 123)
  
  # Split data
  n <- nrow(data)
  n_test <- round(n * test_fraction)
  test_indices <- sample(1:n, n_test)
  
  train_data <- data[-test_indices, ]
  test_data <- data[test_indices, ]
  
  cat("Training N:", nrow(train_data), "\n")
  cat("Test N:", nrow(test_data), "\n")
  
  # Run analysis on training data
  train_result <- analysis_function(train_data,
                                     group_var = analysis_spec$group_var,
                                     controls = analysis_spec$controls)
  
  # Evaluate on test data
  # (For logistic regression: calculate predicted probabilities)
  test_result <- tryCatch({
    if (!is.null(train_result$model)) {
      predicted_probs <- predict(train_result$model, newdata = test_data, type = "response")
      
      # Compare predicted vs actual
      actual <- test_data$conviction
      predicted <- predicted_probs > 0.5
      
      accuracy <- mean(predicted == actual, na.rm = TRUE)
      
      # Check if group effect is present in test data
      test_group_effect <- train_result$odds_ratios$odds_ratio[2]
      test_group_ci <- train_result$odds_ratios$ci_lower[2]
      
      # Run analysis on test data separately
      test_analysis <- analysis_function(test_data,
                                          group_var = analysis_spec$group_var,
                                          controls = analysis_spec$controls)
      
      test_group_effect_actual <- test_analysis$odds_ratios$odds_ratio[2]
      
      list(
        passed = abs(test_group_effect - test_group_effect_actual) < 0.2,
        train_effect = test_group_effect,
        test_effect = test_group_effect_actual,
        effect_difference = abs(test_group_effect - test_group_effect_actual),
        accuracy = accuracy,
        interpretation = ifelse(abs(test_group_effect - test_group_effect_actual) < 0.2,
          paste0("Effect consistent in test data (train OR=", round(test_group_effect, 2), 
                 ", test OR=", round(test_group_effect_actual, 2), ")"),
          paste0("WARNING: Effect not consistent (train OR=", round(test_group_effect, 2), 
                 ", test OR=", round(test_group_effect_actual, 2), ")")
        )
      )
    } else {
      list(passed = FALSE, note = "Could not evaluate out-of-sample")
    }
  }, error = function(e) {
    list(passed = FALSE, note = e$message)
  })
  
  return(test_result)
}

# ============================================================
# TEST 5: TEMPORAL ROBUSTNESS
# ============================================================
# Temporal robustness tests whether effects persist over time.
# A genuine bias should be consistent across periods; a spurious
# correlation may be period-specific.

temporal_robustness <- function(data, analysis_function, analysis_spec,
                                 time_var = "date", n_periods = 4) {
  
  cat("\n=== TEMPORAL ROBUSTNESS ===\n")
  
  # Split data into time periods
  data_sorted <- data[order(data[[time_var]]), ]
  period_size <- ceiling(nrow(data_sorted) / n_periods)
  
  period_results <- list()
  
  for (i in 1:n_periods) {
    start_idx <- (i - 1) * period_size + 1
    end_idx <- min(i * period_size, nrow(data_sorted))
    
    period_data <- data_sorted[start_idx:end_idx, ]
    
    cat("Period", i, ":", nrow(period_data), "cases\n")
    
    period_result <- tryCatch({
      analysis_function(period_data,
                         group_var = analysis_spec$group_var,
                         controls = analysis_spec$controls)
    }, error = function(e) {
      list(error = e$message)
    })
    
    period_results[[paste0("period_", i)]] <- period_result
  }
  
  # Check consistency
  effects <- sapply(period_results, function(pr) {
    if (!is.null(pr$odds_ratios)) {
      pr$odds_ratios$odds_ratio[2]
    } else {
      NA
    }
  })
  
  sig_flags <- sapply(period_results, function(pr) {
    if (!is.null(pr$odds_ratios)) {
      pr$odds_ratios$p_value[2] < 0.05
    } else {
      NA
    }
  })
  
  # Cochran's Q test for homogeneity
  # (Tests whether effect is consistent across periods)
  if (all(!is.na(sig_flags))) {
    # Simple consistency check: all periods show same direction?
    all_positive <- all(effects > 1, na.rm = TRUE)
    all_negative <- all(effects < 1, na.rm = TRUE)
    consistent_direction <- all_positive || all_negative
    
    # All periods significant?
    all_significant <- all(sig_flags, na.rm = TRUE)
    
    passed <- consistent_direction && (all_significant || sum(sig_flags, na.rm = TRUE) >= 2)
  } else {
    passed <- FALSE
    consistent_direction <- NA
    all_significant <- NA
  }
  
  return(list(
    passed = passed,
    consistent_direction = consistent_direction,
    all_significant = all_significant,
    effects = effects,
    significance_flags = sig_flags,
    period_results = period_results,
    interpretation = ifelse(passed,
      "Effect direction consistent across time periods",
      "WARNING: Effect not consistent over time - may be period-specific"
    )
  ))
}

# ============================================================
# TEST 6: ALTERNATIVE EXPLANATION TESTING
# ============================================================
# Alternative explanation testing systematically evaluates whether
# the observed effect could be explained by factors other than bias.
#
# This is the most important disconfirmation test because it directly
# addresses the question: "What else could explain this?"
#
# Tests include:
# - Differential case complexity
# - Pre-court screening differences
# - Plea bargaining dynamics
# - Resource constraints
# - Geographic variation
# - Temporal trends
# - Prosecutor/judge assignment patterns

alternative_explanation_testing <- function(data, main_result, group_var,
                                             controls) {
  
  cat("\n=== ALTERNATIVE EXPLANATION TESTING ===\n")
  
  explanations <- list()
  
  # 1. Case complexity explanation
  # If more complex cases are assigned to one group, the effect may be spurious
  cat("Testing case complexity explanation...\n")
  
  complexity_test <- tryCatch({
    # Test whether case complexity differs by group
    complexity_by_group <- data %>%
      dplyr::group_by(!!rlang::sym(group_var)) %>%
      dplyr::summarise(
        mean_severity = mean(as.numeric(offense_severity), na.rm = TRUE),
        mean_violence = mean(is_violent, na.rm = TRUE),
        mean_charges = mean(charges_count, na.rm = TRUE),
        .groups = "drop"
      )
    
    # If complexity differs, include in model
    complexity_differs <- any(
      abs(diff(complexity_by_group$mean_severity)) > 0.5 |
      abs(diff(complexity_by_group$mean_violence)) > 0.1 |
      abs(diff(complexity_by_group$mean_charges)) > 0.5
    )
    
    explanations[["case_complexity"]] <- list(
      explanation = "Differential case complexity",
      test_result = complexity_differs,
      interpretation = ifelse(complexity_differs,
        "Case complexity differs by group - include severity controls",
        "Case complexity similar across groups"
      ),
      data = complexity_by_group
    )
  }, error = function(e) {
    list(explanation = "case_complexity", error = e$message)
  })
  
  # 2. Pre-court screening explanation
  # If arrest/charging decisions differ by group, the effect may be pre-court
  cat("Testing pre-court screening explanation...\n")
  
  screening_test <- tryCatch({
    # Compare arrest rates by group
    arrest_by_group <- data %>%
      dplyr::group_by(!!rlang::sym(group_var)) %>%
      dplyr::summarise(
        arrest_rate = mean(!is.na(arrest_date)),
        .groups = "drop"
      )
    
    screening_differs <- abs(diff(arrest_by_group$arrest_rate)) > 0.1
    
    explanations[["screening"]] <- list(
      explanation = "Pre-court screening differences",
      test_result = screening_differs,
      interpretation = ifelse(screening_differs,
        "Arrest rates differ by group - effect may originate pre-court",
        "Arrest rates similar across groups"
      ),
      data = arrest_by_group
    )
  }, error = function(e) {
    list(explanation = "screening", error = e$message)
  })
  
  # 3. Plea bargaining explanation
  # If plea bargaining patterns differ by group, outcomes may reflect
  # bargaining dynamics rather than bias
  cat("Testing plea bargaining explanation...\n")
  
  plea_test <- tryCatch({
    plea_by_group <- data %>%
      dplyr::group_by(!!rlang::sym(group_var)) %>%
      dplyr::summarise(
        plea_rate = mean(plea == "guilty" | plea == "no_contest"),
        .groups = "drop"
      )
    
    plea_differs <- abs(diff(plea_by_group$plea_rate)) > 0.1
    
    explanations[["plea"]] <- list(
      explanation = "Plea bargaining dynamics",
      test_result = plea_differs,
      interpretation = ifelse(plea_differs,
        "Plea rates differ by group - may reflect bargaining, not bias",
        "Plea rates similar across groups"
      ),
      data = plea_by_group
    )
  }, error = function(e) {
    list(explanation = "plea", error = e$message)
  })
  
  # 4. Resource constraints explanation
  # If one group has less access to quality representation, outcomes
  # may reflect resource constraints rather than bias
  cat("Testing resource constraints explanation...\n")
  
  resource_test <- tryCatch({
    # This would require data on representation quality
    # For now, test as a placeholder
    explanations[["resources"]] <- list(
      explanation = "Resource constraints / representation quality",
      test_result = NA,
      interpretation = "Requires representation quality data",
      data = NULL
    )
  }, error = function(e) {
    list(explanation = "resources", error = e$message)
  })
  
  # 5. Geographic variation
  # If effect is localized to specific courts/judges, it may be
  # individual rather than systemic
  cat("Testing geographic/jurisdiction variation...\n")
  
  geo_test <- tryCatch({
    # Compare effects across jurisdictions
    by_jurisdiction <- data %>%
      dplyr::group_by(jurisdiction_id) %>%
      dplyr::filter(n() >= 30) %>%
      dplyr::do({
        result <- tryCatch({
          disparate_impact_conviction(., group_var = group_var, controls = controls)
        }, error = function(e) {
          list(error = e$message)
        })
        
        if (!is.null(result$odds_ratios)) {
          data.frame(
            jurisdiction = .$jurisdiction_id[1],
            odds_ratio = result$odds_ratios$odds_ratio[2],
            p_value = result$odds_ratios$p_value[2],
            significant = result$odds_ratios$p_value[2] < 0.05,
            stringsAsFactors = FALSE
          )
        }
      })
    
    # Check if all jurisdictions show same direction
    if (nrow(by_jurisdiction) > 0) {
      all_positive <- all(by_jurisdiction$odds_ratio > 1, na.rm = TRUE)
      all_negative <- all(by_jurisdiction$odds_ratio < 1, na.rm = TRUE)
      consistent <- all_positive || all_negative
      
      explanations[["geographic"]] <- list(
        explanation = "Geographic/jurisdiction variation",
        test_result = consistent,
        interpretation = ifelse(consistent,
          paste0("Effect consistent across ", nrow(by_jurisdiction), " jurisdictions"),
          paste0("Effect varies across jurisdictions - may be localized")
        ),
        data = by_jurisdiction
      )
    } else {
      explanations[["geographic"]] <- list(
        explanation = "Geographic variation",
        test_result = NA,
        interpretation = "Insufficient data for jurisdiction-level analysis"
      )
    }
  }, error = function(e) {
    list(explanation = "geographic", error = e$message)
  })
  
  # Evaluate overall
  tests_passed <- sum(sapply(explanations, function(e) {
    if (is.null(e$test_result) || is.na(e$test_result)) return(FALSE)
    !e$test_result  # Explanation should NOT be true (otherwise it explains the effect)
  }), na.rm = TRUE)
  
  tests_total <- length(explanations)
  
  return(list(
    explanations = explanations,
    passed = tests_passed >= tests_total * 0.6,  # 60% threshold
    interpretation = paste0(
      tests_passed, "/", tests_total, " alternative explanations ",
      "not supported by data"
    ),
    recommendations = if (tests_passed < tests_total * 0.6) {
      c("Re-examine data for alternative explanations",
        "Consider additional controls",
        "Collect more complete data")
    } else {
      c("Main effect not fully explained by alternative factors",
        "Consider additional robustness checks")
    }
  ))
}

# ============================================================
# MASTER FUNCTION: RUN ALL DISCONFIRMATION TESTS
# ============================================================

run_full_disconfirmation <- function(data, analysis_function, analysis_spec,
                                      placebo_specs = NULL,
                                      alternative_specs = NULL,
                                      negative_controls = NULL,
                                      time_var = "date") {
  
  cat("\n")
  cat("========================================\n")
  cat("FULL DISCONFIRMATION TESTING\n")
  cat("========================================\n")
  cat("Analysis:", analysis_spec$name, "\n")
  cat("Group:", analysis_spec$group_var, "\n")
  cat("N:", nrow(data), "\n")
  cat("========================================\n\n")
  
  results <- list(
    analysis_name = analysis_spec$name,
    group_var = analysis_spec$group_var,
    n_observations = nrow(data),
    tests = list()
  )
  
  # 1. Placebo tests
  if (!is.null(placebo_specs)) {
    cat("Running placebo tests...\n")
    placebo_results <- lapply(placebo_specs, function(ps) {
      placebo_test(data, analysis_function, analysis_spec, 
                    ps$start, ps$end)
    })
    results$tests$placebo <- placebo_results
  }
  
  # 2. Specification sensitivity
  if (!is.null(alternative_specs)) {
    cat("Running specification sensitivity tests...\n")
    results$tests$specification <- specification_sensitivity(data, 
                                                              analysis_spec, 
                                                              alternative_specs)
  }
  
  # 3. Negative controls
  if (!is.null(negative_controls)) {
    cat("Running negative control tests...\n")
    results$tests$negative_controls <- negative_control_test(
      data, analysis_spec$main_outcome, negative_controls,
      analysis_spec$group_var, analysis_spec$controls
    )
  }
  
  # 4. Out-of-sample validation
  cat("Running out-of-sample validation...\n")
  results$tests$out_of_sample <- out_of_sample_validation(
    data, analysis_function, analysis_spec
  )
  
  # 5. Temporal robustness
  cat("Running temporal robustness tests...\n")
  results$tests$temporal <- temporal_robustness(
    data, analysis_function, analysis_spec, time_var
  )
  
  # 6. Alternative explanation testing
  cat("Testing alternative explanations...\n")
  results$tests$alternative_explanations <- alternative_explanation_testing(
    data, NULL, analysis_spec$group_var, analysis_spec$controls
  )
  
  # Overall evaluation
  test_results <- sapply(results$tests, function(t) {
    if (is.null(t$passed)) return(FALSE)
    t$passed
  })
  
  results$overall <- list(
    passed = all(test_results, na.rm = TRUE),
    passed_count = sum(test_results, na.rm = TRUE),
    total_count = length(test_results),
    interpretation = paste0(
      sum(test_results, na.rm = TRUE), "/", length(test_results), 
      " disconfirmation tests passed"
    )
  )
  
  cat("\n=== DISCONFIRMATION SUMMARY ===\n")
  cat(results$overall$interpretation, "\n")
  cat("========================================\n\n")
  
  return(results)
}

# ============================================================
# REPORT FINDINGS WITH DISCONFIRMATION RESULTS
# ============================================================

report_findings <- function(analysis_result, disconfirmation_result,
                             output_file = NULL) {
  
  report <- c(
    "# Analysis Report with Disconfirmation Testing",
    "",
    paste0("**Date:** ", Sys.Date()),
    paste0("**N observations:** ", disconfirmation_result$n_observations),
    "",
    "## Main Findings",
    if (!is.null(analysis_result$descriptive)) {
      capture.output(print(analysis_result$descriptive))
    } else {
      character(0)
    },
    "",
    "## Statistical Results",
    if (!is.null(analysis_result$chisq_test)) {
      c(
        paste0("- Chi-square: X² = ", round(analysis_result$chisq_test$statistic, 2),
               ", p = ", format.pval(analysis_result$chisq_test$p.value))
      )
    } else if (!is.null(analysis_result$model_summary)) {
      capture.output(head(analysis_result$model_summary, 10))
    } else {
      character(0)
    },
    "",
    "## Effect Sizes",
    if (!is.null(analysis_result$odds_ratios)) {
      capture.output(print(analysis_result$odds_ratios))
    } else if (!is.null(analysis_result$percent_differences)) {
      capture.output(print(analysis_result$percent_differences))
    } else {
      character(0)
    },
    "",
    "## Disconfirmation Testing Results",
    "",
    "### Placebo Tests",
    if (!is.null(disconfirmation_result$tests$placebo)) {
      sapply(disconfirmation_result$tests$placebo, function(p) {
        paste0("- ", p$test_name, ": ", p$interpretation)
      })
    } else {
      "Not tested"
    },
    "",
    "### Specification Sensitivity",
    if (!is.null(disconfirmation_result$tests$specification)) {
      paste0("- ", disconfirmation_result$tests$specification$summary$interpretation)
    } else {
      "Not tested"
    },
    "",
    "### Negative Controls",
    if (!is.null(disconfirmation_result$tests$negative_controls)) {
      paste0("- ", disconfirmation_result$tests$negative_controls$interpretation)
    } else {
      "Not tested"
    },
    "",
    "### Out-of-Sample Validation",
    if (!is.null(disconfirmation_result$tests$out_of_sample)) {
      paste0("- ", disconfirmation_result$tests$out_of_sample$interpretation)
    } else {
      "Not tested"
    },
    "",
    "### Temporal Robustness",
    if (!is.null(disconfirmation_result$tests$temporal)) {
      paste0("- ", disconfirmation_result$tests$temporal$interpretation)
    } else {
      "Not tested"
    },
    "",
    "### Alternative Explanations",
    if (!is.null(disconfirmation_result$tests$alternative_explanations)) {
      paste0("- ", disconfirmation_result$tests$alternative_explanations$interpretation)
    } else {
      "Not tested"
    },
    "",
    "## Overall Disconfirmation Summary",
    paste0("- **Result:** ", disconfirmation_result$overall$interpretation),
    paste0("- **Passed:** ", disconfirmation_result$overall$passed_count, "/", 
           disconfirmation_result$overall$total_count),
    "",
    "## Limitations",
    "- Analysis conditional on cases reaching court",
    "- Demographic data may be incomplete",
    "- Does not control for attorney quality or judicial assignment",
    "- Ecological fallacy possible at aggregate level",
    "",
    "## Confidence Assessment",
    if (disconfirmation_result$overall$passed) {
      "**High confidence:** Finding survived systematic disconfirmation attempts"
    } else {
      "**Moderate/Low confidence:** Finding did not survive all disconfirmation tests"
    }
  )
  
  report_text <- paste(report, collapse = "\n")
  
  if (!is.null(output_file)) {
    writeLines(report_text, output_file)
    cat("Report written to:", output_file, "\n")
  }
  
  return(report_text)
}