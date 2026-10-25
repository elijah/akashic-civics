# Akashic Justice R Templates
# Main analysis template for akashic-civics R integration

#' Run descriptive statistics on case data
#' 
#' @param cases data.frame with columns: case_id, conviction, race_ethnicity, offense_severity, prior_convictions
#' @param race_col Name of race/ethnicity column
#' @param conviction_col Name of conviction column (0/1)
#' @return List with conviction_rate, avg_sentence_months, demographic_distribution
run_descriptive_stats <- function(cases, race_col = "race_ethnicity", conviction_col = "conviction") {
  # Ensure required columns exist
  stopifnot(all(c(race_col, conviction_col) %in% names(cases)))
  
  # Compute conviction rate
  total_cases <- nrow(cases)
  convictions <- sum(cases[[conviction_col]], na.rm = TRUE)
  conviction_rate <- if (total_cases > 0) convictions / total_cases else 0
  
  # Compute demographic distribution
  demographic_distribution <- table(cases[[race_col]]) / total_cases
  
  # Compute average sentence if available
  avg_sentence_months <- if ("sentence_months" %in% names(cases)) {
    mean(cases$sentence_months, na.rm = TRUE)
  } else {
    0
  }
  
  return(list(
    case_count = total_cases,
    conviction_rate = conviction_rate,
    avg_sentence_months = avg_sentence_months,
    demographic_distribution = as.list(demographic_distribution)
  ))
}

#' Run two-proportion Z-test
#' 
#' @param p1 Proportion 1
#' @param n1 Sample size 1
#' @param p2 Proportion 2
#' @param n2 Sample size 2
#' @return List with p_value, effect_size, confidence_interval
run_two_proportion_ztest <- function(p1, n1, p2, n2) {
  # Standard error
  se <- sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
  
  # Z-statistic
  z <- if (se > 0) (p1 - p2) / se else 0
  
  # Two-tailed p-value
  p_value <- 2 * pnorm(abs(z), lower.tail = FALSE)
  
  # Effect size (Cohen's h)
  effect_size <- 2 * (asin(sqrt(p1)) - asin(sqrt(p2)))
  
  # Confidence interval for difference
  diff <- p1 - p2
  z_crit <- qnorm(0.975)
  ci_lower <- diff - z_crit * se
  ci_upper <- diff + z_crit * se
  
  return(list(
    p_value = p_value,
    effect_size = effect_size,
    confidence_interval = c(ci_lower, ci_upper)
  ))
}

#' Run disconfirmation battery (placeholder)
#' 
#' @param cases data.frame
#' @return List with test results
run_disconfirmation_battery <- function(cases) {
  # This is a placeholder - full implementation in TypeScript
  return(list(
    aggregated_score = 0.5,
    passed = character(0),
    total = character(0)
  ))
}