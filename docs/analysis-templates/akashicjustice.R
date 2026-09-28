#!/usr/bin/env Rscript
#' akashicjustice: Statistical Analysis Package for Akashic Legal Data
#'
#' This package provides statistical analysis tools for normalized legal/justice
#' data from the Akashic system. It implements rigorous methods for examining
#' disparate impact, sentencing disparities, and judicial outcomes.
#'
#' @name akashicjustice
#' @docType package
#' @importFrom dplyr %>% filter mutate group_by summarise
#' @importFrom tidyr pivot_longer pivot_wider
#' @importFrom lme4 glmer
#' @importFrom sandwich vcovHC
#' @importFrom lmtest coeftest
#' @importFrom survey svydesign svyglm
#' @importFrom mice mice complete
#' @importFrom car Anova linearHypothesis
#' @importFrom ggplot2 ggplot aes geom_bar geom_point geom_errorbar theme_minimal labs
#' @importFrom stats glm binomial predict pchisq coef vcov
#' @importFrom broom tidy glance augment
#' @importFrom haven read_dta read_sav
#' @importFrom readr read_csv write_csv
#' @importFrom jsonlite fromJSON toJSON
"_PACKAGE"

#' Import a normalized case dataset from Akashic JSON export
#'
#' @param filepath Path to JSON file exported from Akashic pipeline
#' @return data.frame with normalized legal cases
#' @export
import_akashic_cases <- function(filepath) {
  data <- jsonlite::fromJSON(filepath)
  
  # Convert to analysis-ready format
  cases <- data$cases
  
  # Expand nested structures
  cases_flat <- cases %>%
    dplyr::mutate(
      offense_severity = purrr::map_chr(charges, ~ .x$offense_severity %||% "unknown"),
      charge_type = purrr::map_chr(charges, ~ .x$charge_type %||% "unknown"),
      is_violent = purrr::map_lgl(charges, ~ .x$is_violent %||% FALSE),
      mandatory_minimum = purrr::map_lgl(charges, ~ .x$mandatory_minimum %||% FALSE),
      conviction = ifelse(outcome$disposition == "conviction", 1, 0),
      sentence_months = outcome$sentence_months %||% 0,
      days_to_disposition = timeline$days_to_disposition %||% NA_real_,
      race_ethnicity = defendant_demographics$race_ethnicity %||% "unknown",
      age_at_arrest = defendant_demographics$age_at_arrest %||% NA_real_,
      gender = defendant_demographics$gender %||% "unknown",
      socioeconomic_proxy = defendant_demographics$socioeconomic_proxy %||% "unknown",
      prior_record_proxy = defendant_demographics$prior_record_proxy %||% "unknown",
      completeness_score = provenance$completeness_score %||% 0
    ) %>%
    dplyr::select(-charges, -outcome, -timeline, -defendant_demographics, -provenance)
  
  return(cases_flat)
}

#' Disparate impact analysis for conviction rates
#'
#' Performs chi-square test and logistic regression to examine whether
#' conviction rates differ across demographic groups, controlling for
#' offense severity and other confounders.
#'
#' @param cases data.frame from import_akashic_cases()
#' @param group_var Character: demographic variable to test (e.g., "race_ethnicity")
#' @param controls Character vector: covariates to include in model
#' @param weights Optional: survey weights for complex sampling
#' @return List with test results, model object, and effect sizes
#' @export
disparate_impact_conviction <- function(cases, group_var, 
                                        controls = c("offense_severity", "charge_type", "age_at_arrest"),
                                        weights = NULL) {
  
  # Filter to cases with complete outcome data
  analysis_data <- cases %>%
    dplyr::filter(!is.na(conviction), !is.na(!!rlang::sym(group_var))) %>%
    dplyr::mutate(
      group = factor(!!rlang::sym(group_var)),
      offense_severity = factor(offense_severity, 
                                levels = c("infraction", "violation", "misdemeanor_second", 
                                           "misdemeanor_first", "felony_third", "felony_second", "felony_first"),
                                ordered = TRUE)
    )
  
  # Descriptive statistics
  descriptive <- analysis_data %>%
    dplyr::group_by(group) %>%
    dplyr::summarise(
      n = dplyr::n(),
      conviction_rate = mean(conviction),
      se = sqrt(conviction_rate * (1 - conviction_rate) / n),
      ci_lower = conviction_rate - 1.96 * se,
      ci_upper = conviction_rate + 1.96 * se,
      .groups = "drop"
    )
  
  # Chi-square test of independence
  chisq_result <- chisq.test(table(analysis_data$group, analysis_data$conviction))
  
  # Logistic regression with controls
  formula_str <- paste("conviction ~ group +", paste(controls, collapse = " + "))
  if (is.null(weights)) {
    model <- stats::glm(formula_str, data = analysis_data, family = binomial())
    robust_se <- sandwich::vcovHC(model, type = "HC1")
  } else {
    design <- survey::svydesign(ids = ~1, weights = weights, data = analysis_data)
    model <- survey::svyglm(formula_str, design = design, family = quasibinomial())
    robust_se <- vcov(model)
  }
  
  model_summary <- broom::tidy(model, conf.int = TRUE)
  
  # Calculate adjusted predictions
  new_data <- expand.grid(
    group = levels(analysis_data$group),
    offense_severity = levels(analysis_data$offense_severity),
    charge_type = "violent",  # reference category
    age_at_arrest = mean(analysis_data$age_at_arrest, na.rm = TRUE),
    stringsAsFactors = FALSE
  )
  
  new_data$predicted_prob <- predict(model, newdata = new_data, type = "response")
  
  # Effect sizes: adjusted odds ratios
  ors <- exp(coef(model))
  or_ci <- exp(confint(model))
  
  return(list(
    descriptive = descriptive,
    chisq_test = chisq_result,
    model = model,
    model_summary = model_summary,
    adjusted_predictions = new_data,
    odds_ratios = data.frame(
      term = names(ors),
      odds_ratio = as.numeric(ors),
      ci_lower = as.numeric(or_ci[, 1]),
      ci_upper = as.numeric(or_ci[, 2])
    ),
    n_observations = nrow(analysis_data),
    groups_tested = levels(analysis_data$group)
  ))
}

#' Sentencing disparity analysis using linear regression
#'
#' Examines sentence length differences across demographic groups,
#' controlling for offense severity, charge type, and prior record.
#'
#' @param cases data.frame from import_akashic_cases()
#' @param group_var Character: demographic variable to test
#' @param controls Character vector: covariates to include
#' @return List with regression results and effect sizes
#' @export
sentencing_disparity <- function(cases, group_var,
                                 controls = c("offense_severity", "charge_type", "prior_record_proxy")) {
  
  analysis_data <- cases %>%
    dplyr::filter(conviction == 1, !is.na(sentence_months), !is.na(!!rlang::sym(group_var))) %>%
    dplyr::mutate(
      group = factor(!!rlang::sym(group_var)),
      log_sentence = log(sentence_months + 1),
      offense_severity = factor(offense_severity,
                                levels = c("infraction", "violation", "misdemeanor_second", 
                                           "misdemeanor_first", "felony_third", "felony_second", "felony_first"),
                                ordered = TRUE),
      prior_record_proxy = factor(prior_record_proxy, ordered = TRUE)
    )
  
  # Descriptive statistics
  descriptive <- analysis_data %>%
    dplyr::group_by(group) %>%
    dplyr::summarise(
      n = dplyr::n(),
      mean_sentence = mean(sentence_months),
      median_sentence = median(sentence_months),
      sd_sentence = sd(sentence_months),
      .groups = "drop"
    )
  
  # Linear regression on log sentence
  formula_str <- paste("log_sentence ~ group +", paste(controls, collapse = " + "))
  model <- stats::lm(formula_str, data = analysis_data)
  robust_se <- sandwich::vcovHC(model, type = "HC1")
  coeftest_robust <- lmtest::coeftest(model, vcov = robust_se)
  
  # Effect sizes: percent difference in sentence length
  coefs <- coef(model)
  group_coefs <- coefs[grepl("^group", names(coefs))]
  pct_diffs <- (exp(group_coefs) - 1) * 100
  
  return(list(
    descriptive = descriptive,
    model = model,
    coeftest_robust = coeftest_robust,
    percent_differences = data.frame(
      group = gsub("^group", "", names(group_coefs)),
      pct_difference = as.numeric(pct_diffs),
      coef = as.numeric(group_coefs),
      se = sqrt(diag(robust_se))[grepl("^group", names(coefs))]
    ),
    n_observations = nrow(analysis_data)
  ))
}

#' Time-to-disposition survival analysis
#'
#' Uses Cox proportional hazards or accelerated failure time models
#' to examine whether demographic groups experience different
#' case processing speeds.
#'
#' @param cases data.frame from import_akashic_cases()
#' @param group_var Character: demographic variable to test
#' @param controls Character vector: covariates to include
#' @return List with survival model results
#' @export
time_to_disposition <- function(cases, group_var,
                                controls = c("offense_severity", "charge_type")) {
  
  # Requires survival package
  if (!requireNamespace("survival", quietly = TRUE)) {
    stop("survival package required for time_to_disposition()")
  }
  
  analysis_data <- cases %>%
    dplyr::filter(!is.na(days_to_disposition), !is.na(!!rlang::sym(group_var))) %>%
    dplyr::mutate(
      group = factor(!!rlang::sym(group_var)),
      event = 1  # all cases have disposition in this filtered set
    )
  
  # Cox proportional hazards
  formula_str <- paste("survival::Surv(days_to_disposition, event) ~ group +", 
                       paste(controls, collapse = " + "))
  
  cox_model <- survival::coxph(as.formula(formula_str), data = analysis_data)
  
  # Test proportional hazards assumption
  ph_test <- survival::cox.zph(cox_model)
  
  # Adjusted survival curves
  new_data <- expand.grid(
    group = levels(analysis_data$group),
    offense_severity = levels(analysis_data$offense_severity),
    charge_type = "violent",
    stringsAsFactors = FALSE
  )
  
  surv_curves <- survival::survfit(cox_model, newdata = new_data)
  
  return(list(
    cox_model = cox_model,
    ph_test = ph_test,
    adjusted_survival = surv_curves,
    n_observations = nrow(analysis_data)
  ))
}

#' Multiple imputation for missing demographic data
#'
#' Uses MICE to impute missing demographic variables before analysis.
#'
#' @param cases data.frame from import_akashic_cases()
#' @param m Number of imputations
#' @param seed Random seed for reproducibility
#' @return List of m imputed datasets
#' @export
impute_missing_demographics <- function(cases, m = 5, seed = 123) {
  if (!requireNamespace("mice", quietly = TRUE)) {
    stop("mice package required for multiple imputation")
  }
  
  # Select variables for imputation
  impute_vars <- cases %>%
    dplyr::select(race_ethnicity, age_at_arrest, gender, socioeconomic_proxy, 
                  prior_record_proxy, offense_severity, charge_type, conviction)
  
  imp <- mice::mice(impute_vars, m = m, seed = seed, printFlag = FALSE)
  imputed_datasets <- lapply(1:m, function(i) mice::complete(imp, i))
  
  return(list(
    imputed_datasets = imputed_datasets,
    mice_object = imp
  ))
}

#' Sensitivity analysis for unmeasured confounding
#'
#' Computes E-values to assess how strong an unmeasured confounder
#' would need to be to explain away observed disparities.
#'
#' @param or Observed odds ratio
#' @param ci_lower Lower confidence bound
#' @param ci_upper Upper confidence bound
#' @return E-value and interpretation
#' @export
evalue_sensitivity <- function(or, ci_lower, ci_upper) {
  if (or >= 1) {
    e_value <- or + sqrt(or * (or - 1))
    e_value_ci <- ci_lower + sqrt(ci_lower * (ci_lower - 1))
  } else {
    e_value <- (1/or) + sqrt((1/or) * ((1/or) - 1))
    e_value_ci <- (1/ci_upper) + sqrt((1/ci_upper) * ((1/ci_upper) - 1))
  }
  
  return(list(
    e_value = e_value,
    e_value_ci_lower = e_value_ci,
    interpretation = paste0(
      "An unmeasured confounder would need to be associated with both ",
      "the exposure and outcome by a risk ratio of at least ",
      round(e_value, 2), " to explain away the observed association."
    )
  ))
}

#' Generate methodological documentation for an analysis
#'
#' Creates a markdown report documenting the analysis methodology,
#' assumptions, limitations, and results for transparency.
#'
#' @param analysis_result Result from one of the analysis functions
#' @param analysis_name Character: name of the analysis
#' @param author Character: analyst name
#' @return Character string with markdown report
#' @export
generate_methodology_report <- function(analysis_result, analysis_name, author = "Akashic Analysis") {
  
  report <- c(
    paste0("# Methodological Report: ", analysis_name),
    "",
    paste0("**Author:** ", author),
    paste0("**Date:** ", Sys.Date()),
    paste0("**N observations:** ", analysis_result$n_observations %||% "Not specified"),
    "",
    "## Data Source",
    "Normalized legal cases from Akashic intelligence pipeline.",
    "Data provenance tracked through Akashic connector system.",
    "",
    "## Analysis Methods",
    if (!is.null(analysis_result$model)) {
      paste0("**Model:** ", class(analysis_result$model)[1])
    } else if (!is.null(analysis_result$cox_model)) {
      "**Model:** Cox Proportional Hazards"
    } else {
      "**Model:** Descriptive / Chi-square"
    },
    "",
    "## Results Summary",
    if (!is.null(analysis_result$chisq_test)) {
      c(
        paste0("- Chi-square test: X² = ", round(analysis_result$chisq_test$statistic, 2),
               ", df = ", analysis_result$chisq_test$parameter,
               ", p = ", format.pval(analysis_result$chisq_test$p.value))
      )
    } else {
      character(0)
    },
    if (!is.null(analysis_result$odds_ratios)) {
      c(
        "- Adjusted Odds Ratios:",
        capture.output(print(analysis_result$odds_ratios))
      )
    } else if (!is.null(analysis_result$percent_differences)) {
      c(
        "- Percent Differences in Sentencing:",
        capture.output(print(analysis_result$percent_differences))
      )
    } else {
      character(0)
    },
    "",
    "## Assumptions",
    "1. Cases are independent observations",
    "2. Charge classification is accurate",
    "3. Demographic data is correctly recorded",
    "4. No unmeasured confounding (tested via E-values)",
    "",
    "## Limitations",
    "- Analysis conditional on cases that reach court (selection bias)",
    "- Demographic data may be incomplete or inferred",
    "- Does not control for attorney quality, judicial assignment, or plea dynamics",
    "- Ecological fallacy possible at aggregate level",
    "",
    "## Alternative Explanations Considered",
    if (!is.null(analysis_result$alternative_explanations)) {
      analysis_result$alternative_explanations
    } else {
      c(
        "Differential case complexity across groups",
        "Pre-court screening by law enforcement",
        "Plea bargaining dynamics",
        "Resource constraints affecting case processing"
      )
    },
    "",
    "## Sensitivity Analysis",
    if (!is.null(analysis_result$odds_ratios)) {
      ors <- analysis_result$odds_ratios
      if (nrow(ors) > 0) {
        main_or <- ors$odds_ratio[2]
        main_ci_l <- ors$ci_lower[2]
        main_ci_u <- ors$ci_upper[2]
        if (!is.na(main_or)) {
          evalue <- evalue_sensitivity(main_or, main_ci_l, main_ci_u)
          c(
            paste0("- E-value for main effect: ", round(evalue$e_value, 2)),
            paste0("- ", evalue$interpretation)
          )
        }
      }
    } else {
      character(0)
    }
  )
  
  return(paste(report, collapse = "\n"))
}