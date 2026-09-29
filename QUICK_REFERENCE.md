# Akashic Justice Analysis System - Quick Reference Card

## One-Page Cheat Sheet

---

### 🚀 Quick Start (3 Commands)

```bash
# 1. Create pre-registration
node scripts/pre-register/pre_register.js create \
  --question="Your research question" \
  --hypothesis="Your directional hypothesis" \
  --outcome=outcome_var \
  --predictor=predictor_var \
  --controls=control1,control2,control3 \
  --alpha=0.05 \
  --output=my_prereg.json

# 2. Validate it
node scripts/pre-register/pre_register.js validate --file=my_prereg.json

# 3. Run analysis in R
Rscript -e '
source("docs/analysis-templates/akashicjustice.R")
source("docs/analysis-templates/disconfirmation.R")
source("docs/analysis-templates/pre_registration.R")
cases <- import_akashic_cases("your_data.json")
reg <- load_pre_registration("my_prereg.json")
results <- pre_registered_analysis(cases, reg, disparate_impact_conviction, "results")
'
```

---

### 📊 R Function Quick Reference

| Function | Purpose | Key Parameters |
|----------|---------|----------------|
| `import_akashic_cases()` | Load data | `filepath` |
| `disparate_impact_conviction()` | Conviction disparity | `data, group_var, controls` |
| `sentencing_disparity()` | Sentence length | `data, group_var, controls` |
| `time_to_disposition()` | Survival analysis | `data, group_var, controls` |
| `impute_missing_demographics()` | Multiple imputation | `data, m=5` |
| `evalue_sensitivity()` | E-value | `or, ci_lower, ci_upper` |
| `generate_methodology_report()` | Report | `results, title, author` |

---

### 🔬 Pre-Registration Functions

| Function | Purpose |
|----------|---------|
| `pre_registration_template()` | Create blank template |
| `save_pre_registration(reg, filepath)` | Save to disk |
| `load_pre_registration(filepath)` | Load from disk |
| `verify_data_processing(data, reg)` | Check data meets criteria |
| `verify_analysis_plan(spec, reg)` | Check analysis matches prereg |
| `compare_pre_post(reg, effect, p, conclusion)` | Compare pre/post |
| `generate_pre_registration_report(reg)` | Create markdown report |
| `pre_registered_analysis(data, reg, fn, dir)` | **Full workflow** |

---

### ⚠️ Disconfirmation Tests (ALL Must Pass)

| Test | Checks | Pass Criteria |
|------|--------|---------------|
| **1. Placebo** | Null periods | No false positives (p ≥ 0.05) |
| **2. Spec Sensitivity** | Alternative models | ≥80% consistent |
| **3. Negative Controls** | Unrelated outcomes | Main sig, controls not |
| **4. Out-of-Sample** | Holdout data | Effect replicates |
| **5. Temporal** | Time periods | Consistent over time |
| **6. Alt Explanations** | Confounders | None supported |

---

### 📋 Required Pre-Registration Fields

```json
{
  "research_question": "string",
  "hypothesis": {
    "statement": "string",
    "directional": "one.sided|two.sided",
    "alpha": 0.05
  },
  "outcome_variable": {
    "name": "string",
    "definition": "string", 
    "type": "binary|continuous"
  },
  "predictor_variable": {
    "name": "string",
    "levels": ["ref", "grp1", "grp2"],
    "reference_level": "ref"
  },
  "control_variables": {
    "controls": {
      "var1": {"description": "string", "type": "string", "included": true}
    },
    "inclusion_criteria": {"n_required": 30}
  },
  "analysis_plan": {
    "method": "logistic regression",
    "model_formula": "outcome ~ predictor + controls",
    "software": "R 4.x+"
  }
}
```

---

### 🎯 Evidentiary Thresholds

**Credible Evidence of Bias = ALL of:**
- [ ] Pre-registered BEFORE data examination
- [ ] Data verification: PASS
- [ ] Plan verification: PASS  
- [ ] ALL 6 disconfirmation tests: PASS
- [ ] Effect direction matches hypothesis
- [ ] No major deviations
- [ ] Limitations stated

---

### 📁 Key Files

| File | Purpose |
|------|---------|
| `akashicjustice.R` | Core analysis |
| `disconfirmation.R` | 6 falsification tests |
| `pre_registration.R` | Prereg + workflow |
| `example_analysis.R` | Full example |
| `legal_justice_schema.md` | Data dictionary |
| `rigorous_bias_analysis.md` | Methodology |
| `pre_register.js` | CLI tool |

---

### 🔧 JavaScript Tools

| Tool | Purpose |
|------|---------|
| `ProvenanceTracker` | Data lineage + quality |
| `HistoricalBaseline` | Temporal snapshots |
| `pre_register.js` | CLI for prereg |

---

### 🚫 Common Pitfalls to Avoid

| Pitfall | Prevention |
|---------|------------|
| HARKing | Preregister FIRST |
| P-hacking | One analysis plan |
| Cherry-picking | Report all tests |
| Ignoring confounders | Use disconfirmation tests |
| False precision | Report CIs, not just p-values |
| No validation | Always out-of-sample test |

---

### 📞 Quick Help

```bash
# CLI help
node scripts/pre-register/pre_register.js --help

# R function help
?disparate_impact_conviction

# Documentation
cat docs/analysis-templates/README.md
cat docs/methodology/rigorous_bias_analysis.md
```

---

### 💡 Remember

> "The system is designed to test and potentially DISCONFIRM your hypotheses.
> A finding that survives falsification attempts has higher evidential value.
> A finding that fails should be revised or rejected."

**This is not about proving a narrative—it's about testing claims against evidence with maximum transparency.**

---

*Version 1.0 | Akashic Civics Project | MIT License*