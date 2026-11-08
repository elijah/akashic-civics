/**
 * Inline R Script Generator
 * 
 * Generates complete, executable R scripts dynamically from analysis specifications.
 * Eliminates dependency on external template files.
 */

import { LegalJusticeCase } from '../normalization/legal_justice_schema';
import { 
  EnhancedRAnalysisOptions, 
  SurvivalAnalysisOptions, 
  MediationAnalysisOptions, 
  MixedEffectsOptions, 
  MachineLearningOptions
} from './types';

export interface RScriptContext {
  dataFile: string;
  outputFile: string;
  options: EnhancedRAnalysisOptions;
  cases?: LegalJusticeCase[];
}

export class InlineRGenerator {
  
  /**
   * Generate complete R script for survival analysis
   */
  static generateSurvivalScript(context: RScriptContext): string {
    const { dataFile, outputFile, options } = context;
    const opts = options as SurvivalAnalysisOptions;
    
    return `
library(survival)
${opts.useKaplanMeier ? 'library(survminer)' : ''}
library(jsonlite)

# Read data
df <- read.csv("${dataFile}", stringsAsFactors = FALSE)

# Prepare survival object
time_var <- "${opts.timeVariable}"
event_var <- "${opts.eventVariable}"

# Validate required columns exist
if (!time_var %in% names(df)) {
  stop(paste("Time variable", time_var, "not found in data"))
}
if (!event_var %in% names(df)) {
  stop(paste("Event variable", event_var, "not found in data"))
}

# Create survival object
surv_obj <- Surv(df[[time_var]], df[[event_var]])

# Run analysis
if ("${opts.groupVariable}" != "" && "${opts.groupVariable}" %in% names(df)) {
  group_var <- "${opts.groupVariable}"
  
  if (${opts.useKaplanMeier ? 'TRUE' : 'FALSE'}) {
    # Kaplan-Meier curves by group
    km_fit <- survfit(surv_obj ~ df[[group_var]], data = df)
    
    # Extract survival curves for each group
    groups <- unique(df[[group_var]])
    survival_curves <- list()
    
    for (g in groups) {
      idx <- which(km_fit$strata == g)
      if (length(idx) > 0) {
        surv_est <- summary(km_fit[g])
        survival_curves[[g]] <- list(
          time_points = as.numeric(surv_est$time),
          survival_probability = as.numeric(surv_est$surv),
          confidence_lower = as.numeric(surv_est$lower),
          confidence_upper = as.numeric(surv_est$upper)
        )
      }
    }
    
    # Log-rank test
    lr_test <- survdiff(surv_obj ~ df[[group_var]], data = df)
    p_value <- 1 - pchisq(lr_test$chisq, length(lr_test$n) - 1)
    
    result <- list(
      analysis_type = "survival_analysis",
      method = "kaplan_meier",
      p_value = as.numeric(p_value),
      sample_size = nrow(df),
      survival_curves = survival_curves,
      data_quality = list(
        n_cases = nrow(df),
        missing_rate = sum(is.na(df[[time_var]]) | is.na(df[[event_var]])) / nrow(df),
        completeness_score = 1 - sum(is.na(df[[time_var]]) | is.na(df[[event_var]])) / nrow(df)
      )
    )
  } else {
    # Cox proportional hazards model
    formula <- as.formula(paste("surv_obj ~", group_var))
    if (length(opts$controlVariables) > 0) {
      valid_controls <- opts$controlVariables[opts$controlVariables %in% names(df)]
      if (length(valid_controls) > 0) {
        formula <- as.formula(paste("surv_obj ~", group_var, "+", paste(valid_controls, collapse = "+")))
      }
    }
    
    cox_fit <- coxph(formula, data = df)
    cox_summary <- summary(cox_fit)
    
    # Extract coefficients
    coef_df <- as.data.frame(cox_summary$coefficients)
    coef_df$term <- rownames(coef_df)
    rownames(coef_df) <- NULL
    
    coefficients <- list()
    for (i in 1:nrow(coef_df)) {
      coefficients[[coef_df$term[i]]] <- list(
        estimate = as.numeric(coef_df$coef[i]),
        std_error = as.numeric(coef_df$"se(coef)"[i]),
        z_value = as.numeric(coef_df$z[i]),
        p_value = as.numeric(coef_df$"Pr(>|z|)"[i])
      )
    }
    
    # Hazard ratios
    hr <- exp(cox_summary$coefficients[, "coef"])
    hr_ci <- exp(cox_summary$conf.int[, c("lower .95", "upper .95")])
    
    result <- list(
      analysis_type = "survival_analysis",
      method = "cox_ph",
      p_value = as.numeric(cox_summary$coefficients[1, "Pr(>|z|)"]),
      confidence_interval = as.numeric(hr_ci[1, ]),
      hazard_ratio = as.numeric(hr[1]),
      sample_size = as.numeric(cox_summary$n),
      model_type = "cox_ph",
      coefficients = coefficients,
      model_summary = list(
        log_likelihood = as.numeric(cox_summary$loglik[2]),
        aic = as.numeric(AIC(cox_fit)),
        concordance = as.numeric(cox_summary$concordance[1])
      ),
      model_diagnostics = list(
        aic = as.numeric(AIC(cox_fit)),
        bic = as.numeric(BIC(cox_fit)),
        log_likelihood = as.numeric(cox_summary$loglik[2]),
        concordance_index = as.numeric(cox_summary$concordance[1])
      ),
      data_quality = list(
        n_cases = nrow(df),
        missing_rate = sum(is.na(df[[time_var]]) | is.na(df[[event_var]])) / nrow(df),
        completeness_score = 1 - sum(is.na(df[[time_var]]) | is.na(df[[event_var]])) / nrow(df)
      )
    )
  }
} else {
  # Overall survival without grouping
  km_fit <- survfit(surv_obj ~ 1, data = df)
  surv_est <- summary(km_fit)
  
  result <- list(
    analysis_type = "survival_analysis",
    method = "kaplan_meier_overall",
    sample_size = nrow(df),
    survival_curves = list(
      overall = list(
        time_points = as.numeric(surv_est$time),
        survival_probability = as.numeric(surv_est$surv),
        confidence_lower = as.numeric(surv_est$lower),
        confidence_upper = as.numeric(surv_est$upper)
      )
    ),
    data_quality = list(
      n_cases = nrow(df),
      missing_rate = sum(is.na(df[[time_var]]) | is.na(df[[event_var]])) / nrow(df),
      completeness_score = 1 - sum(is.na(df[[time_var]]) | is.na(df[[event_var]])) / nrow(df)
    )
  )
}

# Write output
write(toJSON(result, auto_unbox = TRUE), "${outputFile}")
`
  }

  /**
   * Generate complete R script for mediation analysis
   */
  static generateMediationScript(context: RScriptContext): string {
    const { dataFile, outputFile, options } = context;
    const opts = options as MediationAnalysisOptions;
    
    const covariates = opts.covariates && opts.covariates.length > 0 
      ? opts.covariates.filter((c: string) => c && c !== '').map((c: string) => `"${c}"`).join(", ")
      : "NULL";
    
    return `
library(mediation)
library(jsonlite)

# Read data
df <- read.csv("${dataFile}", stringsAsFactors = FALSE)

# Validate required columns
required_vars <- c("${opts.treatmentVariable}", "${opts.mediatorVariable}", "${opts.outcomeVariable}")
missing_vars <- required_vars[!required_vars %in% names(df)]
if (length(missing_vars) > 0) {
  stop(paste("Missing required variables:", paste(missing_vars, collapse = ", ")))
}

# Prepare covariates
covariates <- ${covariates}

# Fit mediator model
if (covariates[1] != "NULL") {
  mediator_formula <- as.formula(paste("${opts.mediatorVariable} ~ ${opts.treatmentVariable} +", paste(covariates, collapse = "+")))
  outcome_formula <- as.formula(paste("${opts.outcomeVariable} ~ ${opts.treatmentVariable} + ${opts.mediatorVariable} +", paste(covariates, collapse = "+")))
} else {
  mediator_formula <- as.formula("${opts.mediatorVariable} ~ ${opts.treatmentVariable}")
  outcome_formula <- as.formula("${opts.outcomeVariable} ~ ${opts.treatmentVariable} + ${opts.mediatorVariable}")
}

mediator_model <- lm(mediator_formula, data = df)
outcome_model <- lm(outcome_formula, data = df)

# Run mediation analysis
med_fit <- mediate(mediator_model, outcome_model, 
                   treat = "${opts.treatmentVariable}",
                   mediator = "${opts.mediatorVariable}",
                   sims = 1000,
                   conf.level = ${opts.alpha ?? 0.95})

med_summary <- summary(med_fit)

# Extract results
result <- list(
  analysis_type = "mediation_analysis",
  indirect_effect = as.numeric(med_summary$d.avg),
  direct_effect = as.numeric(med_summary$z.avg),
  total_effect = as.numeric(med_summary$tau.avg),
  proportion_mediated = as.numeric(med_summary$n.avg),
  p_value = as.numeric(med_summary$d.avg.p),
  confidence_interval = c(as.numeric(med_summary$d.avg.ci[1]), as.numeric(med_summary$d.avg.ci[2])),
  confidence_interval_indirect = c(as.numeric(med_summary$d.avg.ci[1]), as.numeric(med_summary$d.avg.ci[2])),
  confidence_interval_direct = c(as.numeric(med_summary$z.avg.ci[1]), as.numeric(med_summary$z.avg.ci[2])),
  confidence_interval_total = c(as.numeric(med_summary$tau.avg.ci[1]), as.numeric(med_summary$tau.avg.ci[2])),
  sample_size = nrow(df),
  model_type = "mediation",
  model_summary = list(
    mediator_model = list(
      r_squared = as.numeric(summary(mediator_model)$r.squared),
      coefficients = as.list(coef(mediator_model))
    ),
    outcome_model = list(
      r_squared = as.numeric(summary(outcome_model)$r.squared),
      coefficients = as.list(coef(outcome_model))
    )
  ),
  coefficients = list(),
  model_diagnostics = list(
    aic = as.numeric(AIC(outcome_model)),
    bic = as.numeric(BIC(outcome_model)),
    log_likelihood = as.numeric(logLik(outcome_model))
  ),
  data_quality = list(
    n_cases = nrow(df),
    missing_rate = sum(is.na(df[, required_vars])) / (nrow(df) * length(required_vars)),
    completeness_score = 1 - sum(is.na(df[, required_vars])) / (nrow(df) * length(required_vars))
  )
)

# Write output
write(toJSON(result, auto_unbox = TRUE), "${outputFile}")
`
  }

  /**
   * Generate complete R script for mixed-effects analysis
   */
  static generateMixedEffectsScript(context: RScriptContext): string {
    const { dataFile, outputFile, options } = context;
    const opts = options as MixedEffectsOptions;
    
    return `
library(lme4)
library(jsonlite)

# Read data
df <- read.csv("${dataFile}", stringsAsFactors = FALSE)

# Validate formula variables
all_vars <- all.vars(as.formula(paste("${opts.fixedFormula} + ${opts.randomFormula}")))
missing_vars <- all_vars[!all_vars %in% names(df)]
if (length(missing_vars) > 0) {
  stop(paste("Missing variables in data:", paste(missing_vars, collapse = ", ")))
}

# Fit mixed-effects model
formula_str <- paste("${opts.fixedFormula}", "+ (", "${opts.randomFormula}", ")")
formula <- as.formula(formula_str)

model <- lmer(formula, data = df, REML = FALSE)
model_summary <- summary(model)

# Extract fixed effects
fixed_effects <- as.data.frame(model_summary$coefficients)
fixed_effects$term <- rownames(fixed_effects)
rownames(fixed_effects) <- NULL

coefficients <- list()
for (i in 1:nrow(fixed_effects)) {
  coefficients[[fixed_effects$term[i]]] <- list(
    estimate = as.numeric(fixed_effects$Estimate[i]),
    std_error = as.numeric(fixed_effects$"Std. Error"[i]),
    z_value = as.numeric(fixed_effects$"t value"[i]),
    p_value = as.numeric(2 * pt(-abs(fixed_effects$"t value"[i]), df = model_summary$devcomp$dims$n - model_summary$devcomp$dims$p))
  )
}

# Extract random effects variance
ranef_var <- as.data.frame(VarCorr(model))
random_effects <- list()
for (i in 1:nrow(ranef_var)) {
  random_effects[[ranef_var$grp[i]]] <- list(
    variance = as.numeric(ranef_var$vcov[i]),
    sd = as.numeric(ranef_var$sdcor[i])
  )
}

# Effect size (standardized fixed effect for first non-intercept term)
fixed_terms <- fixed_effects$term[fixed_effects$term != "(Intercept)"]
effect_size <- 0
p_value <- 1
ci <- c(0, 0)

if (length(fixed_terms) > 0) {
  first_term <- fixed_terms[1]
  effect_size <- as.numeric(fixed_effects$Estimate[fixed_effects$term == first_term])
  se <- as.numeric(fixed_effects$"Std. Error"[fixed_effects$term == first_term])
  p_value <- as.numeric(2 * pt(-abs(fixed_effects$"t value"[fixed_effects$term == first_term]), df = model_summary$devcomp$dims$n - model_summary$devcomp$dims$p))
  ci <- c(effect_size - 1.96 * se, effect_size + 1.96 * se)
}

result <- list(
  analysis_type = "mixed_effects_analysis",
  effect_size = effect_size,
  p_value = p_value,
  confidence_interval = ci,
  sample_size = nrow(df),
  model_type = "lme4",
  model_summary = list(
    fixed_effects = coefficients,
    random_effects = random_effects,
    aic = as.numeric(AIC(model)),
    bic = as.numeric(BIC(model)),
    log_likelihood = as.numeric(logLik(model)),
    deviance = as.numeric(deviance(model))
  ),
  coefficients = coefficients,
  model_diagnostics = list(
    aic = as.numeric(AIC(model)),
    bic = as.numeric(BIC(model)),
    log_likelihood = as.numeric(logLik(model)),
    pseudo_r_squared = as.numeric(1 - (deviance(model) / model_summary$devcomp$cmp["null.deviance"]))
  ),
  data_quality = list(
    n_cases = nrow(df),
    missing_rate = sum(is.na(df[, all_vars])) / (nrow(df) * length(all_vars)),
    completeness_score = 1 - sum(is.na(df[, all_vars])) / (nrow(df) * length(all_vars))
  )
)

# Write output
write(toJSON(result, auto_unbox = TRUE), "${outputFile}")
`
  }

  /**
   * Generate complete R script for machine learning analysis
   */
  static generateMLScript(context: RScriptContext): string {
    const { dataFile, outputFile, options } = context;
    const opts = options as MachineLearningOptions;
    
    return `
library(caret)
library(jsonlite)

# Read data
df <- read.csv("${dataFile}", stringsAsFactors = FALSE)

# Validate outcome variable
if (!"${opts.outcomeVariable}" %in% names(df)) {
  stop(paste("Outcome variable ${opts.outcomeVariable} not found in data"))
}

# Prepare data
outcome <- "${opts.outcomeVariable}"
predictors <- setdiff(names(df), c(outcome, "id", "case_id", "jurisdiction_id"))

# Remove columns with too many missing values
missing_frac <- sapply(df[, predictors], function(x) sum(is.na(x)) / length(x))
predictors <- predictors[missing_frac < 0.5]

# Impute missing values (simple median/mode)
for (p in predictors) {
  if (is.numeric(df[[p]])) {
    df[[p]][is.na(df[[p]])] <- median(df[[p]], na.rm = TRUE)
  } else {
    df[[p]][is.na(df[[p]])] <- names(sort(table(df[[p]]), decreasing = TRUE))[1]
  }
}

# Set up cross-validation
ctrl <- trainControl(
  method = "${opts.crossValidation ? 'cv' : 'none'}",
  number = ${opts.folds ?? 10},
  classProbs = TRUE,
  summaryFunction = twoClassSummary
)

# Define algorithm
algorithm <- "${opts.algorithm ?? 'rf'}"

# Train model
set.seed(42)
model <- train(
  as.formula(paste(outcome, "~ .")),
  data = df[, c(predictors, outcome)],
  method = algorithm,
  trControl = ctrl,
  tuneLength = ${opts.tuneParameters ? '5' : '1'},
  metric = "ROC"
)

# Get predictions for evaluation
pred <- predict(model, df[, c(predictors, outcome)], type = "prob")
pred_class <- predict(model, df[, c(predictors, outcome)])

# Calculate metrics
if (is.factor(df[[outcome]])) {
  confusion <- confusionMatrix(pred_class, df[[outcome]])
  accuracy <- as.numeric(confusion$overall["Accuracy"])
  sensitivity <- as.numeric(confusion$byClass["Sensitivity"])
  specificity <- as.numeric(confusion$byClass["Specificity"])
  
  # AUC
  library(pROC)
  roc_obj <- roc(df[[outcome]], pred[, 2])
  auc <- as.numeric(auc(roc_obj))
} else {
  # Regression metrics
  accuracy <- cor(pred_class, df[[outcome]])^2
  sensitivity <- NA
  specificity <- NA
  auc <- NA
}

# Feature importance
imp <- varImp(model)
feature_importance <- list()
if (!is.null(imp$importance)) {
  imp_df <- as.data.frame(imp$importance)
  for (i in 1:nrow(imp_df)) {
    feature_importance[[rownames(imp_df)[i]]] <- as.numeric(imp_df[i, 1])
  }
}

result <- list(
  analysis_type = "machine_learning_analysis",
  prediction_accuracy = list(
    accuracy = accuracy,
    sensitivity = sensitivity,
    specificity = specificity,
    auc = auc
  ),
  feature_importance = feature_importance,
  sample_size = nrow(df),
  model_type = paste0("ml_", algorithm),
  model_summary = list(
    algorithm = algorithm,
    best_tune = model$bestTune,
    final_model = capture.output(print(model$finalModel))
  ),
  coefficients = list(),
  model_diagnostics = list(
    aic = NA,
    bic = NA,
    log_likelihood = NA
  ),
  data_quality = list(
    n_cases = nrow(df),
    missing_rate = mean(missing_frac),
    completeness_score = 1 - mean(missing_frac)
  )
)

# Write output
write(toJSON(result, auto_unbox = TRUE), "${outputFile}")
`
  }

  /**
   * Generate complete R script for custom analysis
   */
  static generateCustomScript(
    context: RScriptContext,
    rCode: string
  ): string {
    return `
library(jsonlite)

# Read data
df <- read.csv("${context.dataFile}", stringsAsFactors = FALSE)

# Custom analysis code
${rCode}

# Write output
write(toJSON(result, auto_unbox = TRUE), "${context.outputFile}")
`
  }

  /**
   * Generate R script for basic disparate impact analysis
   */
  static generateDisparateImpactScript(
    context: RScriptContext,
    groupVar: string,
    outcomeVar: string,
    controlVars: string[] = [],
    _alpha: number = 0.05
  ): string {
    const controls = controlVars.length > 0 
      ? controlVars.map(v => `"${v}"`).join(", ")
      : "NULL";
    
    return `
library(jsonlite)

# Read data
df <- read.csv("${context.dataFile}", stringsAsFactors = FALSE)

# Validate required columns
required_vars <- c("${groupVar}", "${outcomeVar}")
missing_vars <- required_vars[!required_vars %in% names(df)]
if (length(missing_vars) > 0) {
  stop(paste("Missing required variables:", paste(missing_vars, collapse = ", ")))
}

# Prepare control variables
control_vars <- ${controls}

# Run logistic regression for disparate impact
if (control_vars[1] != "NULL") {
  formula <- as.formula(paste("${outcomeVar} ~ ${groupVar} +", paste(control_vars, collapse = "+")))
} else {
  formula <- as.formula("${outcomeVar} ~ ${groupVar}")
}

# Ensure binary outcome
df[[outcomeVar]] <- as.factor(df[[outcomeVar]])

model <- glm(formula, data = df, family = binomial)
model_summary <- summary(model)

# Extract coefficients
coef_df <- as.data.frame(model_summary$coefficients)
coef_df$term <- rownames(coef_df)
rownames(coef_df) <- NULL

coefficients <- list()
odds_ratios <- list()
for (i in 1:nrow(coef_df)) {
  term_name <- coef_df$term[i]
  estimate <- as.numeric(coef_df$Estimate[i])
  se <- as.numeric(coef_df$"Std. Error"[i])
  z <- as.numeric(coef_df$"z value"[i])
  p <- as.numeric(coef_df$"Pr(>|z|)"[i])
  
  coefficients[[term_name]] <- list(
    estimate = estimate,
    std_error = se,
    z_value = z,
    p_value = p
  )
  
  odds_ratios[[term_name]] <- list(
    odds_ratio = exp(estimate),
    ci_lower = exp(estimate - 1.96 * se),
    ci_upper = exp(estimate + 1.96 * se)
  )
}

# Get group effect (first non-intercept term)
group_terms <- coef_df$term[coef_df$term != "(Intercept)"]
effect_size <- 0
p_value <- 1
ci <- c(0, 0)
odds_ratio <- 1

if (length(group_terms) > 0) {
  first_term <- group_terms[1]
  effect_size <- as.numeric(coef_df$Estimate[coef_df$term == first_term])
  se <- as.numeric(coef_df$"Std. Error"[coef_df$term == first_term])
  p_value <- as.numeric(coef_df$"Pr(>|z|)"[coef_df$term == first_term])
  ci <- c(effect_size - 1.96 * se, effect_size + 1.96 * se)
  odds_ratio <- exp(effect_size)
}

result <- list(
  analysis_type = "disparate_impact_conviction",
  effect_size = effect_size,
  p_value = p_value,
  confidence_interval = ci,
  odds_ratio = odds_ratio,
  odds_ratios = odds_ratios,
  sample_size = nrow(df),
  model_type = "logistic_regression",
  model_summary = list(
    aic = as.numeric(AIC(model)),
    null_deviance = as.numeric(model$null.deviance),
    residual_deviance = as.numeric(model$deviance),
    df_residual = as.numeric(model$df.residual)
  ),
  coefficients = coefficients,
  model_diagnostics = list(
    aic = as.numeric(AIC(model)),
    bic = as.numeric(BIC(model)),
    log_likelihood = as.numeric(logLik(model)),
    pseudo_r_squared = as.numeric(1 - model$deviance / model$null.deviance)
  ),
  data_quality = list(
    n_cases = nrow(df),
    missing_rate = sum(is.na(df[, required_vars])) / (nrow(df) * length(required_vars)),
    completeness_score = 1 - sum(is.na(df[, required_vars])) / (nrow(df) * length(required_vars))
  )
)

# Write output
write(toJSON(result, auto_unbox = TRUE), "${context.outputFile}")
`
  }
}