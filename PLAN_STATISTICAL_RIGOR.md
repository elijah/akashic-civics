# Plan: Building a Methodologically Rigorous System for Social Analysis

## About This Project

Akashic Civics is an **extension to the main Akashic project**. The main Akashic project aggregates intelligence about the world — aircraft, satellites, earthquakes, weather, public radio, infrastructure, country intelligence, public cameras, and open-source reconnaissance. Akashic Civics applies the same data pipeline to a domain where the questions are harder: **hyper-local government and civic institutions**.

In that domain, the questions matter deeply:

- Do certain demographic groups receive longer sentences for comparable offenses?
- Are case processing times longer for some groups than others?
- Do officials' decisions vary in ways that cannot be explained by case characteristics?

These questions carry real social and political weight, and they are precisely the questions where a methodologically weak analysis would be easily dismissed — and where a methodologically careful one could genuinely illuminate injustice. We therefore designed this system to make the **care** itself visible: pre-registration before data examination, disconfirmation testing before claims are made, transparent provenance for every data point, and automatic documentation of every limitation. A finding that survives all of this is evidence of a quality that a sloppier analysis could never produce.

This system is designed around one core principle: **we must go to extraordinary lengths to ensure our questions do not pre-poison the data or reflect bias on our part.** When asking difficult questions about hyper-local government, we deliberately construct analyses that exert a large amount of effort toward avoiding bias and avoiding the appearance of political activism. The resulting analyses make clear that we are not acting out of anti-LEO, anti-government, or other politically questionable motives; instead, we are eliciting answers from systems that are rigorously self-checking.

## Goal
Build a system that enables rigorous, evidence-based analysis of social patterns (including potential biases in legal systems) with methodological standards that withstand scrutiny.

## Core Principles
1. **Transparency** - All methods, data sources, and limitations clearly documented
2. **Falsifiability** - System designed to test and potentially disconfirm hypotheses
3. **Reproducibility** - Complete, versioned pipeline from raw data to results
4. **Statistical Rigor** - Proper controls, effect sizes, confidence intervals
5. **Humility** - Explicit statement of what the system cannot determine

## Phase 1: Data Infrastructure Improvements (Current Focus)

### 1.1 Data Normalization Layer
Create a unified schema that all legal/justice data flows through:
- Standardized offense severity coding (felony/misdemeanor levels, specific statutes)
- Uniform demographic fields (with privacy-preserving options)
- Consistent case processing timestamps (arrest, charge, plea, disposition)
- Standardized outcome categories (dismissal, conviction, acquittal, diversion)
- Data quality flags for missing/inconsistent fields

### 1.2 Provenance & Metadata Tracking
For every data point:
- Source connector name and version
- Timestamp of ingestion
- Original raw data reference (when possible)
- Data quality assessments
- Transformation history

### 1.3 Historical Baseline System
- Store normalized snapshots over time (daily/weekly)
- Enable comparison against historical baselines
- Track changes in data collection/reporting practices
- Baseline for anomaly detection

### 1.4 Statistical Analysis Preparation
- Design schema to support regression analysis (numeric/categorical fields)
- Create derived variables commonly needed in analysis (offense severity scores, etc.)
- Ensure proper handling of missing data (multiple imputation flags)
- Pre-aggregate common statistics where appropriate for performance

## Phase 2: Analysis Framework

### 2.1 Statistical Modules
- Descriptive statistics engine (frequencies, cross-tabs, means)
- Regression framework (linear, logistic, Poisson as appropriate)
- Effect size calculation (Cohen's d, odds ratios, etc.)
- Confidence interval estimation
- Multiple comparison correction

### 2.2 Diagnostic & Robustness Tools
- Model assumption testing (linearity, homoscedasticity, independence)
- Sensitivity analysis framework (varying model specifications)
- Subgroup analysis capabilities
- Placebo/falsification test generators

### 2.3 Alternative Explanation Testing
- Systematic testing of confounding variables
- Jurisdiction comparison frameworks
- Temporal analysis (pre/post policy changes)
- Instrumental variable approaches (where applicable)

## Phase 3: Integration & Interface

### 3.1 R/Statistical Software Integration
- Create R package interface to normalized data
- Export/import functions for common formats (CSV, Feather, Parquet)
- Pre-built analysis templates in Rmarkdown/Quarto
- Integration with CRAN packages for:
  - Survey sampling (survey package)
  - Regression diagnostics (car, lmtest)
  - Multiple imputation (mice)
  - Causal inference (MatchIt, causaltreat)
  - Visualization (ggplot2, plotly)

### 3.2 LLM Integration for Rigorous Inquiry
- Design prompts that require methodological clarity
- "Show me the regression table for X controlling for Y, Z"
- "What are the effect sizes and confidence intervals?"
- "How does this change when we add W as a control?"
- "What are the limitations of this analysis?"
- Built-in uncertainty quantification in responses

### 3.3 Validation & Transparency Features
- Automated methodology documentation generation
- Pre-registration of analysis plans
- Version-controlled analytical code
- Data dictionary with field definitions and sources
- Limitations and assumptions clearly stated in all outputs

## Implementation Roadmap

### Immediate Next Steps (This Sprint)
1. [ ] Design and implement normalized legal/justice data schema
2. [ ] Create provenance tracking system for all ingested data
3. [ ] Add historical snapshot capability to data pipeline
4. [ ] Document schema and transformation logic

### Short Term (Next 2-4 Weeks)
1. [ ] Build basic statistical analysis module (descriptive stats + OLS)
2. [ ] Create R interface functions
3. [ ] Develop analysis templates for common justice system questions
4. [ ] Implement model diagnostics and sensitivity checks

### Medium Term (1-2 Months)
1. [ ] Integrate with key CRAN packages for advanced analysis
2. [ ] Build disconfirmation testing framework
3. [ ] Create automated methodology documentation
4. [ ] Implement pre-registration system for analyses

### Long Term (Ongoing)
1. [ ] Continuous validation against external benchmarks
2. [ ] Community peer review processes
3. [ ] Educational materials on interpretation limitations
4. [ ] Expansion to other social domains beyond justice

## Success Criteria
- A analyst can reproduce any result from raw data to final output
- All analyses include effect sizes, confidence intervals, and limitations
- The system actively surfaces alternative explanations
- Methodological documentation is generated automatically
- Users can query the system with precise statistical questions

## Files to Create/Modify
- `docs/methodology/` - Methodological framework documents
- `docs/data-dictionary/` - Field definitions and sources
- `src/statistical/` - Analysis engine code
- `src/normalization/` - Data schema and transformation logic
- `docs/analysis-templates/` - Pre-built R/Quarto templates
- `scripts/pre-register/` - Analysis pre-registration tools

Let's start with the data infrastructure improvements.