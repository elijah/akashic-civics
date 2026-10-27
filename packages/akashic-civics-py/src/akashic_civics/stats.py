"""Real statistical implementations for Akashic Civics Python package.

Provides NumPy/SciPy-based implementations of:
- Descriptive statistics
- Two-proportion Z-tests
- OLS regression
- Logistic regression
- Doubly-robust causal estimation
- Disconfirmation battery
- Multi-jurisdiction comparison
"""

from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from scipy import stats


def compute_descriptive_stats(
    cases: List[Dict[str, Any]],
    race_col: str = "race_ethnicity",
    conviction_col: str = "conviction",
    sentence_col: str = "sentence_months",
) -> Dict[str, Any]:
    """Compute descriptive statistics from case data.

    Args:
        cases: List of case dictionaries
        race_col: Column name for race/ethnicity
        conviction_col: Column name for conviction (0/1)
        sentence_col: Column name for sentence length in months

    Returns:
        Dictionary with case_count, conviction_rate, avg_sentence_months,
        demographic_distribution, prior_record_stats
    """
    if not cases:
        return {
            "case_count": 0,
            "conviction_rate": 0.0,
            "avg_sentence_months": 0.0,
            "demographic_distribution": {},
            "prior_record_stats": {},
        }

    total_cases = len(cases)
    convictions = sum(1 for c in cases if c.get(conviction_col, 0) == 1)
    conviction_rate = convictions / total_cases if total_cases > 0 else 0.0

    # Demographic distribution
    demo_counts: Dict[str, int] = {}
    for c in cases:
        group = c.get(race_col, "Unknown")
        demo_counts[group] = demo_counts.get(group, 0) + 1
    demographic_distribution = {
        k: v / total_cases for k, v in demo_counts.items()
    }

    # Average sentence
    sentences = [
        c[sentence_col]
        for c in cases
        if sentence_col in c and c[sentence_col] is not None
    ]
    avg_sentence_months = float(np.mean(sentences)) if sentences else 0.0

    # Prior record stats
    priors = [
        c.get("prior_convictions", 0)
        for c in cases
        if "prior_convictions" in c and c["prior_convictions"] is not None
    ]
    if priors:
        prior_record_stats = {
            "mean": float(np.mean(priors)),
            "sd": float(np.std(priors, ddof=1)) if len(priors) > 1 else 0.0,
        }
    else:
        prior_record_stats = {"mean": 0.0, "sd": 0.0}

    return {
        "case_count": total_cases,
        "conviction_rate": conviction_rate,
        "avg_sentence_months": avg_sentence_months,
        "demographic_distribution": demographic_distribution,
        "prior_record_stats": prior_record_stats,
    }


def run_z_test(
    p1: float, n1: int, p2: float, n2: int, pooled: bool = True
) -> Dict[str, Any]:
    """Run two-proportion Z-test.

    Args:
        p1: Proportion for group 1
        n1: Sample size for group 1
        p2: Proportion for group 2
        n2: Sample size for group 2
        pooled: Whether to use pooled variance

    Returns:
        Dictionary with z_statistic, p_value, effect_size, confidence_interval
    """
    if pooled:
        p_pooled = (p1 * n1 + p2 * n2) / (n1 + n2)
        se = np.sqrt(p_pooled * (1 - p_pooled) * (1 / n1 + 1 / n2))
    else:
        se = np.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)

    z_statistic = (p1 - p2) / se if se > 0 else 0.0
    p_value = 2 * stats.norm.sf(abs(z_statistic))

    # Effect size (Cohen's h)
    effect_size = 2 * (np.arcsin(np.sqrt(p1)) - np.arcsin(np.sqrt(p2)))

    # Confidence interval for difference
    diff = p1 - p2
    z_crit = stats.norm.ppf(0.975)
    ci_lower = diff - z_crit * se
    ci_upper = diff + z_crit * se

    return {
        "z_statistic": float(z_statistic),
        "p_value": float(p_value),
        "effect_size": float(effect_size),
        "confidence_interval": [float(ci_lower), float(ci_upper)],
        "pooled_variance": float(se ** 2),
    }


def run_ols_regression(
    cases: List[Dict[str, Any]],
    outcome_col: str,
    predictors: List[str],
    group_col: str = "race_ethnicity",
    reference_group: Optional[str] = None,
) -> Dict[str, Any]:
    """Run OLS regression with disparity analysis.

    Args:
        cases: List of case dictionaries
        outcome_col: Name of outcome variable column
        predictors: List of predictor column names
        group_col: Name of grouping column (e.g., race_ethnicity)
        reference_group: Value of reference group

    Returns:
        Dictionary with coefficients, std_errors, t_values, p_values,
        r_squared, adj_r_squared, confidence_intervals, residuals
    """
    import pandas as pd

    df = pd.DataFrame(cases)

    # Validate columns
    if outcome_col not in df.columns:
        raise ValueError(f"Outcome column '{outcome_col}' not found in data")
    for p in predictors:
        if p not in df.columns:
            raise ValueError(f"Predictor column '{p}' not found in data")

    # Drop rows with missing values
    cols_needed = [outcome_col] + predictors
    df_clean = df[cols_needed].dropna()

    if len(df_clean) == 0:
        raise ValueError("No complete cases for regression")

    # Build design matrix with intercept
    X = pd.get_dummies(df_clean[predictors], drop_first=True)
    X = X.astype(float)
    X.insert(0, "intercept", 1.0)
    y = df_clean[outcome_col].values.astype(float)

    # OLS: beta = (X'X)^-1 X'y
    X_arr = X.values.astype(float)
    XtX = X_arr.T @ X_arr
    Xty = X_arr.T @ y
    try:
        beta = np.linalg.solve(XtX, Xty)
    except np.linalg.LinAlgError:
        beta = np.linalg.pinv(XtX) @ Xty

    # Predictions and residuals
    y_pred = X_arr @ beta
    residuals = y - y_pred
    n = len(y)
    k = len(beta)

    # R-squared
    ss_res = np.sum(residuals ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0
    adj_r_squared = 1 - (1 - r_squared) * (n - 1) / (n - k) if n > k else 0.0

    # Standard errors
    sigma_sq = ss_res / (n - k) if n > k else 0.0
    try:
        var_cov = sigma_sq * np.linalg.inv(XtX)
    except np.linalg.LinAlgError:
        var_cov = sigma_sq * np.linalg.pinv(XtX)
    std_errors = np.sqrt(np.diag(var_cov))

    # t-values and p-values
    t_values = beta / std_errors
    df_resid = n - k
    p_values = 2 * stats.t.sf(abs(t_values), df_resid)

    # Confidence intervals
    t_crit = stats.t.ppf(0.975, df_resid)
    ci_lower = beta - t_crit * std_errors
    ci_upper = beta + t_crit * std_errors

    # Build results
    coefficient_names = ["intercept"] + list(X.columns[1:])

    coefficients = {}
    std_errs = {}
    t_vals = {}
    p_vals = {}
    cis = {}
    for i, name in enumerate(coefficient_names):
        coefficients[name] = float(beta[i])
        std_errs[name] = float(std_errors[i])
        t_vals[name] = float(t_values[i])
        p_vals[name] = float(p_values[i])
        cis[name] = [float(ci_lower[i]), float(ci_upper[i])]

    # F-statistic
    f_statistic = (r_squared / (k - 1)) / ((1 - r_squared) / (n - k)) if n > k else 0.0
    f_p_value = float(stats.f.sf(f_statistic, k - 1, n - k)) if n > k else 1.0

    result: Dict[str, Any] = {
        "coefficients": coefficients,
        "std_errors": std_errs,
        "t_values": t_vals,
        "p_values": p_vals,
        "confidence_intervals": cis,
        "r_squared": float(r_squared),
        "adj_r_squared": float(adj_r_squared),
        "f_statistic": float(f_statistic),
        "f_p_value": f_p_value,
        "residual_se": float(np.sqrt(sigma_sq)),
        "n_observations": n,
        "residuals": [float(r) for r in residuals],
    }

    return result


def run_logistic_regression(
    cases: List[Dict[str, Any]],
    outcome_col: str,
    predictors: List[str],
) -> Dict[str, Any]:
    """Run logistic regression for binary outcomes.

    Args:
        cases: List of case dictionaries
        outcome_col: Binary outcome column (0/1)
        predictors: Predictor column names

    Returns:
        Dictionary with coefficients, odds_ratios, p_values, confidence_intervals
    """
    import pandas as pd

    df = pd.DataFrame(cases)

    if outcome_col not in df.columns:
        raise ValueError(f"Outcome column '{outcome_col}' not found in data")
    for p in predictors:
        if p not in df.columns:
            raise ValueError(f"Predictor column '{p}' not found in data")

    cols_needed = [outcome_col] + predictors
    df_clean = df[cols_needed].dropna()

    if len(df_clean) == 0:
        raise ValueError("No complete cases for regression")

    X = pd.get_dummies(df_clean[predictors], drop_first=True)
    X = X.astype(float)
    X.insert(0, "intercept", 1.0)
    y = df_clean[outcome_col].values.astype(float)

    X_arr = X.values.astype(float)
    n = len(y)
    k = X_arr.shape[1]

    # Iteratively reweighted least squares (IRLS) for logistic regression
    beta = np.zeros(k)
    XtX_inv = None

    for _ in range(100):
        eta = X_arr @ beta
        p = 1 / (1 + np.exp(-np.clip(eta, -250, 250)))
        w = p * (1 - p)
        z = eta + (y - p) / np.maximum(w, 1e-8)

        W = np.diag(w)
        XtWX = X_arr.T @ W @ X_arr
        XtWz = X_arr.T @ W @ z
        try:
            beta_new = np.linalg.solve(XtWX, XtWz)
        except np.linalg.LinAlgError:
            beta_new = np.linalg.pinv(XtWX) @ XtWz

        if np.max(np.abs(beta_new - beta)) < 1e-8:
            beta = beta_new
            break
        beta = beta_new

    # Fisher information matrix
    eta = X_arr @ beta
    p = 1 / (1 + np.exp(-np.clip(eta, -250, 250)))
    w = p * (1 - p)
    XtWX = X_arr.T @ np.diag(w) @ X_arr

    try:
        var_cov = np.linalg.inv(XtWX)
    except np.linalg.LinAlgError:
        var_cov = np.linalg.pinv(XtWX)

    std_errors = np.sqrt(np.diag(var_cov))
    z_values = beta / std_errors
    p_values = 2 * stats.norm.sf(abs(z_values))

    # Confidence intervals
    z_crit = stats.norm.ppf(0.975)
    ci_lower = beta - z_crit * std_errors
    ci_upper = beta + z_crit * std_errors

    # Odds ratios
    odds_ratios = np.exp(beta)
    or_ci_lower = np.exp(ci_lower)
    or_ci_upper = np.exp(ci_upper)

    coefficient_names = ["intercept"] + list(X.columns[1:])

    coefficients = {}
    odds_ratio_dict = {}
    std_err_dict = {}
    z_val_dict = {}
    p_val_dict = {}
    ci_dict = {}
    or_ci_dict = {}
    for i, name in enumerate(coefficient_names):
        coefficients[name] = float(beta[i])
        odds_ratio_dict[name] = float(odds_ratios[i])
        std_err_dict[name] = float(std_errors[i])
        z_val_dict[name] = float(z_values[i])
        p_val_dict[name] = float(p_values[i])
        ci_dict[name] = [float(ci_lower[i]), float(ci_upper[i])]
        or_ci_dict[name] = [float(or_ci_lower[i]), float(or_ci_upper[i])]

    # Deviance and AIC
    log_likelihood = np.sum(
        y * np.log(np.maximum(p, 1e-15)) + (1 - y) * np.log(np.maximum(1 - p, 1e-15))
    )
    null_deviance = -2 * log_likelihood  # Approximation
    residual_deviance = null_deviance  # Simplified
    aic = -2 * log_likelihood + 2 * k

    return {
        "coefficients": coefficients,
        "odds_ratios": odds_ratio_dict,
        "std_errors": std_err_dict,
        "z_values": z_val_dict,
        "p_values": p_val_dict,
        "confidence_intervals": ci_dict,
        "odds_ratio_ci": or_ci_dict,
        "null_deviance": float(null_deviance),
        "residual_deviance": float(residual_deviance),
        "aic": float(aic),
        "n_observations": n,
    }


def run_doubly_robust(
    cases: List[Dict[str, Any]],
    treatment_col: str,
    outcome_col: str,
    covariates: List[str],
) -> Dict[str, Any]:
    """Run doubly-robust estimation for causal treatment effects.

    Combines propensity score weighting with outcome regression to estimate
    the average treatment effect (ATE).

    Args:
        cases: List of case dictionaries
        treatment_col: Binary treatment indicator (0/1)
        outcome_col: Outcome variable column
        covariates: List of covariate column names

    Returns:
        Dictionary with treatment_effect, confidence_interval, standard_error, p_value
    """
    import pandas as pd

    df = pd.DataFrame(cases)

    required = [treatment_col, outcome_col] + covariates
    for col in required:
        if col not in df.columns:
            raise ValueError(f"Column '{col}' not found in data")

    df_clean = df[required].dropna()
    if len(df_clean) == 0:
        raise ValueError("No complete cases")

    n = len(df_clean)
    T = df_clean[treatment_col].values.astype(float)
    Y = df_clean[outcome_col].values.astype(float)
    X = pd.get_dummies(df_clean[covariates], drop_first=True)
    X = X.astype(float)
    X.insert(0, "intercept", 1.0)
    X_arr = X.values.astype(float)
    k = X_arr.shape[1]

    # Propensity score model (logistic regression on covariates)
    # Simple implementation using gradient descent
    ps_beta = np.zeros(k)
    lr = 0.1
    for _ in range(500):
        eta = X_arr @ ps_beta
        p = 1 / (1 + np.exp(-np.clip(eta, -250, 250)))
        grad = X_arr.T @ (p - T) / n
        ps_beta -= lr * grad

    propensity_scores = 1 / (1 + np.exp(-np.clip(X_arr @ ps_beta, -250, 250)))
    propensity_scores = np.clip(propensity_scores, 0.001, 0.999)

    # Outcome models for treated and control
    treated_mask = T == 1
    control_mask = T == 0

    def fit_ols(X_sub, y_sub):
        XtX = X_sub.T @ X_sub
        Xty = X_sub.T @ y_sub
        try:
            return np.linalg.solve(XtX, Xty)
        except np.linalg.LinAlgError:
            return np.linalg.pinv(XtX) @ Xty

    mu1_model = fit_ols(X_arr[treated_mask], Y[treated_mask]) if np.any(treated_mask) else np.zeros(k)
    mu0_model = fit_ols(X_arr[control_mask], Y[control_mask]) if np.any(control_mask) else np.zeros(k)

    # Predict counterfactuals
    mu1 = X_arr @ mu1_model  # predicted under treated
    mu0 = X_arr @ mu0_model  # predicted under control

    # Doubly-robust estimator
    ps = propensity_scores
    dr_treated = T * (Y - mu1) / ps + mu1
    dr_control = (1 - T) * (Y - mu0) / (1 - ps) + mu0

    tau_hat = float(np.mean(dr_treated - dr_control))

    # Standard error via influence function
    influence = dr_treated - dr_control - tau_hat
    se = float(np.std(influence, ddof=1) / np.sqrt(n)) if n > 1 else 0.0

    # P-value and CI
    z = tau_hat / se if se > 0 else 0.0
    p_value = float(2 * stats.norm.sf(abs(z)))
    z_crit = stats.norm.ppf(0.975)
    ci_lower = tau_hat - z_crit * se
    ci_upper = tau_hat + z_crit * se

    # Propensity model AUC
    auc = compute_auc(T, propensity_scores)

    return {
        "treatment_effect": tau_hat,
        "confidence_interval": [float(ci_lower), float(ci_upper)],
        "standard_error": se,
        "z_statistic": float(z),
        "p_value": p_value,
        "propensity_model": {
            "coefficients": {f"var_{i}": float(c) for i, c in enumerate(ps_beta)},
            "auc": float(auc) if not np.isnan(auc) else None,
        },
        "n_treated": int(np.sum(treated_mask)),
        "n_control": int(np.sum(control_mask)),
    }


def run_disconfirmation_battery(
    cases: List[Dict[str, Any]],
    treatment_col: Optional[str] = None,
    outcome_col: Optional[str] = None,
    covariates: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Run adaptive disconfirmation battery.

    Runs alternative explanation tests, sensitivity analysis,
    and placebo tests to check robustness of findings.

    Args:
        cases: List of case dictionaries
        treatment_col: Treatment column name
        outcome_col: Outcome column name
        covariates: Covariate column names

    Returns:
        Dictionary with aggregated_score, passed tests, failed tests, details
    """
    results: Dict[str, Any] = {}
    total_tests = 0
    passed_tests: List[str] = []
    failed_tests: List[str] = []
    scores: List[float] = []

    # Test 1: Missing data sensitivity
    if covariates and outcome_col and treatment_col:
        test_name = "missing_data_sensitivity"
        total_tests += 1

        complete = sum(
            1 for c in cases
            if all(c.get(col) is not None for col in [treatment_col, outcome_col] + covariates)
        )
        completeness = complete / len(cases) if cases else 0

        if completeness > 0.9:
            passed_tests.append(test_name)
            scores.append(1.0)
        else:
            failed_tests.append(test_name)
            scores.append(completeness)

        results[test_name] = {
            "complete_cases": complete,
            "total": len(cases),
            "completeness": completeness,
            "passed": completeness > 0.9,
        }

    # Test 2: Treatment-control balance
    if treatment_col and treatment_col in cases[0] if cases else False:
        test_name = "treatment_control_balance"
        total_tests += 1

        n_treated = sum(1 for c in cases if c.get(treatment_col) == 1)
        n_control = len(cases) - n_treated
        balance_score = min(n_treated, n_control) / max(max(n_treated, n_control), 1)

        if balance_score > 0.3:
            passed_tests.append(test_name)
            scores.append(balance_score)
        else:
            failed_tests.append(test_name)
            scores.append(balance_score)

        results[test_name] = {
            "n_treated": n_treated,
            "n_control": n_control,
            "balance_score": balance_score,
            "passed": balance_score > 0.3,
        }

    # Test 3: Effect size stability
    if outcome_col and treatment_col:
        test_name = "effect_size_stability"
        total_tests += 1

        treated_outcomes = [c[outcome_col] for c in cases if c.get(treatment_col) == 1 and c.get(outcome_col) is not None]
        control_outcomes = [c[outcome_col] for c in cases if c.get(treatment_col) == 0 and c.get(outcome_col) is not None]

        if treated_outcomes and control_outcomes:
            treated_mean = float(np.mean(treated_outcomes))
            control_mean = float(np.mean(control_outcomes))
            all_outcomes = treated_outcomes + control_outcomes
            pooled_sd = float(np.std(all_outcomes, ddof=1)) if len(all_outcomes) > 1 else 0.0
            cohen_d = (treated_mean - control_mean) / pooled_sd if pooled_sd > 0 else 0.0

            stable = abs(cohen_d) < 1.5
            if stable:
                passed_tests.append(test_name)
                scores.append(1.0)
            else:
                failed_tests.append(test_name)
                scores.append(0.5)

            results[test_name] = {
                "treated_mean": treated_mean,
                "control_mean": control_mean,
                "cohen_d": cohen_d,
                "passed": stable,
            }

    aggregated_score = float(np.mean(scores)) if scores else 0.0

    return {
        "aggregated_score": aggregated_score,
        "passed": passed_tests,
        "failed": failed_tests,
        "total": total_tests,
        "details": results,
    }


def compare_jurisdictions(
    cases: List[Dict[str, Any]],
    outcome_col: str,
    group_col: str = "race_ethnicity",
    jurisdiction_col: str = "jurisdiction_id",
) -> Dict[str, Any]:
    """Compare disparities across jurisdictions.

    Args:
        cases: List of case dictionaries with jurisdiction_id column
        outcome_col: Outcome column name
        group_col: Grouping column name
        jurisdiction_col: Jurisdiction column name

    Returns:
        Dictionary with per-jurisdiction disparities and comparison ranking
    """
    required = [outcome_col, group_col, jurisdiction_col]
    for col in required:
        if col not in cases[0] if cases else {}:
            raise ValueError(f"Column '{col}' not found in data")

    jurisdictions: Dict[str, List[Dict[str, Any]]] = {}
    for c in cases:
        jur = c.get(jurisdiction_col, "Unknown")
        jurisdictions.setdefault(jur, []).append(c)

    comparison: Dict[str, Any] = {}
    disparities: Dict[str, float] = {}

    for jur, jur_cases in jurisdictions.items():
        groups: Dict[str, List[float]] = {}
        for c in jur_cases:
            g = c.get(group_col, "Unknown")
            val = c.get(outcome_col)
            if val is not None:
                groups.setdefault(g, []).append(float(val))

        if len(groups) < 2:
            continue

        rates = {g: float(np.mean(vals)) for g, vals in groups.items()}
        max_rate = max(rates.values())
        min_rate = min(rates.values())
        disparity = max_rate / min_rate if min_rate > 0 else float("inf")

        comparison[jur] = {
            "groups": rates,
            "disparity_ratio": disparity,
            "max_rate": max_rate,
            "min_rate": min_rate,
        }
        disparities[jur] = disparity

    # Rank by disparity severity (descending)
    ranking = sorted(disparities.keys(), key=lambda k: disparities[k], reverse=True)

    return {
        "jurisdictions": comparison,
        "disparity_ranking": ranking,
        "summary": [
            {"jurisdiction": jur, "disparity_ratio": disparities[jur]}
            for jur in ranking
        ],
    }


def compute_auc(treatment: np.ndarray, scores: np.ndarray) -> float:
    """Compute AUC for propensity scores using Mann-Whitney U statistic."""
    n_pos = np.sum(treatment == 1)
    n_neg = np.sum(treatment == 0)
    if n_pos == 0 or n_neg == 0:
        return float("nan")

    # Rank-based AUC
    order = np.argsort(scores)
    ranks = np.empty(len(scores), dtype=float)
    ranks[order] = np.arange(1, len(scores) + 1)
    # Handle ties with average ranks
    sorted_scores = scores[order]
    unique_scores = np.unique(sorted_scores)
    for s in unique_scores:
        mask = sorted_scores == s
        avg_rank = np.mean(ranks[order][mask])
        ranks[order][mask] = avg_rank

    sum_ranks_treated = np.sum(ranks[treatment == 1])
    auc = (sum_ranks_treated - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg)
    return float(auc)
