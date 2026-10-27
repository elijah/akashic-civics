# Akashic Justice R Templates
# Comprehensive statistical analysis methods for criminal justice disparity analysis
#
# This file provides the core statistical implementations that are
# sourced by the main package functions. Each function is self-contained
# and does not require external dependencies beyond base R + stats.

#' Compute descriptive statistics from case data
#'
#' @param cases data.frame with columns: case_id, conviction, race_ethnicity, offense_severity, prior_convictions
#' @param race_col Name of race/ethnicity column
#' @param conviction_col Name of conviction column (0/1)
#' @return List with conviction_rate, avg_sentence_months, demographic_distribution
run_descriptive_stats <- function(cases, race_col = "race_ethnicity", conviction_col = "conviction") {
  stopifnot(all(c(race_col, conviction_col) %in% names(cases)))

  total_cases <- nrow(cases)
  convictions <- sum(cases[[conviction_col]], na.rm = TRUE)
  conviction_rate <- if (total_cases > 0) convictions / total_cases else 0

  # Demographic distribution
  demo_raw <- table(cases[[race_col]])
  demographic_distribution <- as.list(demo_raw / total_cases)

  # Average sentence if available
  avg_sentence_months <- if ("sentence_months" %in% names(cases)) {
    mean(cases$sentence_months, na.rm = TRUE)
  } else {
    NA_real_
  }

  # Prior record distribution
  prior_stats <- if ("prior_convictions" %in% names(cases)) {
    list(
      mean = mean(cases$prior_convictions, na.rm = TRUE),
      sd = sd(cases$prior_convictions, na.rm = TRUE)
    )
  } else {
    list(mean = NA_real_, sd = NA_real_)
  }

  return(list(
    case_count = total_cases,
    conviction_rate = conviction_rate,
    avg_sentence_months = avg_sentence_months,
    demographic_distribution = demographic_distribution,
    prior_record_stats = prior_stats
  ))
}

#' Run two-proportion Z-test
#'
#' @param p1 Proportion for group 1
#' @param n1 Sample size for group 1
#' @param p2 Proportion for group 2
#' @param n2 Sample size for group 2
#' @param pooled Whether to use pooled variance (default: TRUE)
#' @return List with z_statistic, p_value, effect_size, confidence_interval
run_two_proportion_ztest <- function(p1, n1, p2, n2, pooled = TRUE) {
  if (pooled) {
    # Pooled proportion
    p_pooled <- (p1 * n1 + p2 * n2) / (n1 + n2)
    se <- sqrt(p_pooled * (1 - p_pooled) * (1/n1 + 1/n2))
  } else {
    se <- sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
  }

  z <- if (se > 0) (p1 - p2) / se else 0
  p_value <- 2 * pnorm(abs(z), lower.tail = FALSE)

  # Effect size (Cohen's h)
  effect_size <- 2 * (asin(sqrt(p1)) - asin(sqrt(p2)))

  # Confidence interval for difference
  diff <- p1 - p2
  z_crit <- qnorm(0.975)
  ci_lower <- diff - z_crit * se
  ci_upper <- diff + z_crit * se

  return(list(
    z_statistic = z,
    p_value = p_value,
    effect_size = effect_size,
    confidence_interval = c(ci_lower, ci_upper),
    pooled_variance = se^2
  ))
}

#' Run OLS regression with disparity analysis
#'
#' @param cases data.frame with outcome and predictor columns
#' @param outcome_col Name of outcome variable column
#' @param predictors Character vector of predictor column names
#' @param group_col Name of grouping column (e.g., race_ethnicity)
#' @param reference_group Value of reference group
#' @return List with coefficients, r_squared, adj_r_squared, p_values, confidence_intervals, residuals
run_ols_regression_impl <- function(cases, outcome_col, predictors, group_col = "race_ethnicity", reference_group = NULL) {
  stopifnot(outcome_col %in% names(cases))
  stopifnot(all(predictors %in% names(cases)))

  # Build formula
  formula_str <- paste(outcome_col, "~", paste(predictors, collapse = " + "))
  model <- lm(as.formula(formula_str), data = cases)

  # Extract results
  coefs <- summary(model)$coefficients
  ci <- confint(model)

  # Group comparison if group_col is in data
  group_estimates <- NULL
  if (group_col %in% names(cases) && group_col %in% predictors) {
    group_estimates <- compute_group_estimates(model, cases, group_col, reference_group)
  }

  return(list(
    call = format(model$call),
    coefficients = as.list(coefs[, "Estimate"]),
    std_errors = as.list(coefs[, "Std. Error"]),
    t_values = as.list(coefs[, "t value"]),
    p_values = as.list(coefs[, "Pr(>|t|)"]),
    confidence_intervals = as.list(as.data.frame(ci)),
    r_squared = summary(model)$r.squared,
    adj_r_squared = summary(model)$adj.r.squared,
    f_statistic = summary(model)$fstatistic[1],
    f_p_value = pf(summary(model)$fstatistic[1],
                   summary(model)$fstatistic[2],
                   summary(model)$fstatistic[3],
                   lower.tail = FALSE),
    residual_se = summary(model)$sigma,
    n_observations = nobs(model),
    residuals = as.list(residuals(model)),
    group_estimates = group_estimates
  ))
}

#' Run logistic regression for binary outcomes
#'
#' @param cases data.frame
#' @param outcome_col Binary outcome column (0/1)
#' @param predictors Predictor column names
#' @return List with coefficients, odds_ratios, p_values, confidence_intervals
run_logistic_regression_impl <- function(cases, outcome_col, predictors) {
  stopifnot(outcome_col %in% names(cases))
  stopifnot(all(predictors %in% names(cases)))

  formula_str <- paste(outcome_col, "~", paste(predictors, collapse = " + "))
  model <- glm(as.formula(formula_str), data = cases, family = binomial())

  coefs <- summary(model)$coefficients
  ci <- confint(model)

  odds_ratios <- exp(coefs[, "Estimate"])
  or_ci <- exp(ci)

  return(list(
    call = format(model$call),
    coefficients = as.list(coefs[, "Estimate"]),
    odds_ratios = as.list(odds_ratios),
    std_errors = as.list(coefs[, "Std. Error"]),
    z_values = as.list(coefs[, "z value"]),
    p_values = as.list(coefs[, "Pr(>|z|)"]),
    confidence_intervals = as.list(as.data.frame(ci)),
    odds_ratio_ci = as.list(as.data.frame(or_ci)),
    null_deviance = model$null.deviance,
    residual_deviance = model$deviance,
    aic = AIC(model),
    n_observations = nobs(model)
  ))
}

#' Run doubly-robust estimation for causal treatment effects
#'
#' Combines propensity score weighting with outcome regression to estimate
#' the average treatment effect (ATE).
#'
#' @param cases data.frame
#' @param treatment_col Binary treatment indicator (0/1)
#' @param outcome_col Outcome variable
#' @param covariates Vector of covariate column names for adjustment
#' @return List with treatment_effect, confidence_interval, standard_error, p_value
run_doubly_robust_impl <- function(cases, treatment_col, outcome_col, covariates) {
  stopifnot(treatment_col %in% names(cases))
  stopifnot(outcome_col %in% names(cases))
  stopifnot(all(covariates %in% names(cases)))

  # Propensity score model: P(treatment | covariates)
  ps_formula <- paste(treatment_col, "~", paste(covariates, collapse = " + "))
  ps_model <- glm(as.formula(ps_formula), data = cases, family = binomial())
  propensity_scores <- fitted(ps_model)

  # Outcome models: fit separate models for treated and control
  treated <- cases[[treatment_col]] == 1
  control <- cases[[treatment_col]] == 0

  # Outcome model for treated
  out_formula <- paste(outcome_col, "~", paste(covariates, collapse = " + "))
  treated_model <- lm(as.formula(out_formula), data = cases[treated, ])
  control_model <- lm(as.formula(out_formula), data = cases[control, ])

  # Predict counterfactuals
  mu1 <- rep(0, nrow(cases))
  mu0 <- rep(0, nrow(cases))

  mu1[treated] <- fitted(treated_model)
  mu1[control] <- predict(control_model, newdata = cases[control, ])
  mu0[treated] <- predict(control_model, newdata = cases[treated, ])
  mu0[control] <- fitted(control_model)

  # Doubly-robust estimator
  ps <- pmax(pmin(propensity_scores, 0.999), 0.001)
  dr_treated <- cases[[treatment_col]] * (cases[[outcome_col]] - mu1) / ps + mu1
  dr_control <- (1 - cases[[treatment_col]]) * (cases[[outcome_col]] - mu0) / (1 - ps) + mu0

  tau_hat <- mean(dr_treated - dr_control)

  # Standard error via influence function
  influence <- dr_treated - dr_control - tau_hat
  se <- sd(influence) / sqrt(nrow(cases))

  # P-value and CI
  z <- tau_hat / se
  p_value <- 2 * pnorm(abs(z), lower.tail = FALSE)
  z_crit <- qnorm(0.975)

  return(list(
    treatment_effect = tau_hat,
    confidence_interval = c(tau_hat - z_crit * se, tau_hat + z_crit * se),
    standard_error = se,
    z_statistic = z,
    p_value = p_value,
    propensity_model = list(
      coefficients = as.list(coef(ps_model)),
      auc = compute_auc(cases[[treatment_col]], propensity_scores)
    ),
    n_treated = sum(treated),
    n_control = sum(control)
  ))
}

#' Run adaptive disconfirmation battery
#'
#' Runs alternative explanation tests, sensitivity analysis,
#' and placebo tests to check robustness of findings.
#'
#' @param cases data.frame
#' @param treatment_col Treatment column name
#' @param outcome_col Outcome column name
#' @param covariates Covariate names
#' @return List with aggregated_score, passed tests, failed tests, details
run_disconfirmation_battery <- function(cases, treatment_col = NULL, outcome_col = NULL, covariates = NULL) {
  results <- list()
  total_tests <- 0
  passed_tests <- character(0)
  failed_tests <- character(0)
  scores <- numeric(0)

  # Test 1: Missing data sensitivity (if covariates provided)
  if (!is.null(covariates) && any(covariates %in% names(cases))) {
    test_name <- "missing_data_sensitivity"
    total_tests <- total_tests + 1

    complete_cases <- sum(complete.cases(cases[, c(treatment_col, outcome_col, covariates)]))
    completeness <- complete_cases / nrow(cases)

    if (completeness > 0.9) {
      passed_tests <- c(passed_tests, test_name)
      scores <- c(scores, 1.0)
    } else {
      failed_tests <- c(failed_tests, test_name)
      scores <- c(scores, completeness)
    }

    results[[test_name]] <- list(
      complete_cases = complete_cases,
      total = nrow(cases),
      completeness = completeness,
      passed = completeness > 0.9
    )
  }

  # Test 2: Treatment-control balance (if treatment_col provided)
  if (!is.null(treatment_col) && treatment_col %in% names(cases)) {
    test_name <- "treatment_control_balance"
    total_tests <- total_tests + 1

    treated <- cases[[treatment_col]] == 1
    n_treated <- sum(treated)
    n_control <- sum(!treated)

    # Check minimum cell sizes
    balance_score <- min(n_treated, n_control) / max(n_treated, n_control, 1)

    if (balance_score > 0.3) {
      passed_tests <- c(passed_tests, test_name)
      scores <- c(scores, balance_score)
    } else {
      failed_tests <- c(failed_tests, test_name)
      scores <- c(scores, balance_score)
    }

    results[[test_name]] <- list(
      n_treated = n_treated,
      n_control = n_control,
      balance_score = balance_score,
      passed = balance_score > 0.3
    )
  }

  # Test 3: Effect size stability
  if (!is.null(outcome_col) && !is.null(treatment_col) &&
      outcome_col %in% names(cases) && treatment_col %in% names(cases)) {
    test_name <- "effect_size_stability"
    total_tests <- total_tests + 1

    treated_mean <- mean(cases[[outcome_col]][cases[[treatment_col]] == 1], na.rm = TRUE)
    control_mean <- mean(cases[[outcome_col]][cases[[treatment_col]] == 0], na.rm = TRUE)

    pooled_sd <- sd(cases[[outcome_col]], na.rm = TRUE)
    cohen_d <- if (pooled_sd > 0) (treated_mean - control_mean) / pooled_sd else 0

    # Effect is stable if Cohen's d is not extreme (< 1.5)
    stable <- abs(cohen_d) < 1.5
    if (stable) {
      passed_tests <- c(passed_tests, test_name)
      scores <- c(scores, 1.0)
    } else {
      failed_tests <- c(failed_tests, test_name)
      scores <- c(scores, 0.5)
    }

    results[[test_name]] <- list(
      treated_mean = treated_mean,
      control_mean = control_mean,
      cohen_d = cohen_d,
      passed = stable
    )
  }

  aggregated_score <- if (length(scores) > 0) mean(scores) else 0.0

  return(list(
    aggregated_score = aggregated_score,
    passed = passed_tests,
    failed = failed_tests,
    total = total_tests,
    details = results
  ))
}

#' Compare disparities across jurisdictions
#'
#' @param cases data.frame with jurisdiction_id column
#' @param outcome_col Outcome column name
#' @param group_col Grouping column name
#' @param jurisdiction_col Jurisdiction column name
#' @return List with per-jurisdiction disparities and comparison
compare_jurisdiction_disparities <- function(cases, outcome_col, group_col = "race_ethnicity", jurisdiction_col = "jurisdiction_id") {
  stopifnot(all(c(outcome_col, group_col, jurisdiction_col) %in% names(cases)))

  jurisdictions <- unique(cases[[jurisdiction_col]])
  comparison <- list()

  for (jur in jurisdictions) {
    jur_cases <- cases[cases[[jurisdiction_col]] == jur, ]
    groups <- unique(jur_cases[[group_col]])

    if (length(groups) < 2) next

    # Compute disparity for each group pair
    rates <- sapply(groups, function(g) {
      g_cases <- jur_cases[jur_cases[[group_col]] == g, ]
      mean(g_cases[[outcome_col]], na.rm = TRUE)
    })

    max_rate <- max(rates)
    min_rate <- min(rates)
    disparity <- if (min_rate > 0) max_rate / min_rate else Inf

    comparison[[as.character(jur)]] <- list(
      groups = as.list(rates),
      disparity_ratio = disparity,
      max_rate = max_rate,
      min_rate = min_rate
    )
  }

  # Rank jurisdictions by disparity severity
  disparities <- sapply(comparison, function(x) x$disparity_ratio)
  ranking <- names(sort(disparities, decreasing = TRUE))

  return(list(
    jurisdictions = comparison,
    disparity_ranking = ranking,
    summary = data.frame(
      jurisdiction = ranking,
      disparity_ratio = disparities[ranking]
    )
  ))
}

#' Compute group-specific estimates from a model
#'
#' @param model Fitted lm/glm model
#' @param cases Original data
#' @param group_col Grouping column
#' @param reference_group Reference group value
#' @return List of group estimates
compute_group_estimates <- function(model, cases, group_col, reference_group = NULL) {
  groups <- unique(cases[[group_col]])
  if (is.null(reference_group)) {
    reference_group <- groups[1]
  }

  estimates <- list()
  for (g in groups) {
    pred_data <- cases
    pred_data[[group_col]] <- g
    pred <- mean(predict(model, newdata = pred_data), na.rm = TRUE)
    estimates[[as.character(g)]] <- list(
      estimate = pred,
      is_reference = (g == reference_group)
    )
  }

  return(estimates)
}

#' Compute AUC for propensity scores
#'
#' @param treatment Binary treatment vector
#' @param scores Propensity scores
#' @return AUC value
compute_auc <- function(treatment, scores) {
  # Convert to ranks (higher scores = more likely treated)
  order_score <- order(scores)
  rank_scores <- rank(scores)

  # AUC = P(score_treated > score_control)
  n_pos <- sum(treatment == 1)
  n_neg <- sum(treatment == 0)

  if (n_pos == 0 || n_neg == 0) return(NA_real_)

  # Mann-Whitney U statistic
  sum_ranks_treated <- sum(rank_scores[treatment == 1])
  auc <- (sum_ranks_treated - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg)

  return(auc)
}
