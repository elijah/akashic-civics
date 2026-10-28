# Akashic Civics: Open-Source Tools for Criminal Justice Disparity Analysis & Civic Democracy

**Conference Presentation — ~45 Minutes**
**Presenter:** Akashic Civics Project Team  
**Audience:** Civic technologists, researchers, policy advocates, local government officials, open-source contributors  

---

## Presentation Format Notes

- **Total time:** ~45 minutes + 5-10 minutes Q&A
- **Slide count:** 18-20 slides
- **Speaker notes** are included under each slide heading in italics
- **Timing markers** are provided at the start of each section
- **Demo cues** are marked with ▶

---

# PART 1: THE PROBLEM AND THE VISION (Minutes 0–10)

## Slide 1: Title

**Akashic Civics**
*Open-source statistical infrastructure for criminal justice disparity analysis*

- Who we are: A community-driven open-source project
- What we do: Give communities, journalists, and researchers tools to measure disparity in local criminal justice systems
- Why it matters: Data is the foundation of accountability in democracy

*Speaker notes:*  
"Good morning. I want to start with a question: How do you know if your local district attorney, police chief, or judge is treating people fairly? The honest answer is: most of the time, you don't. Not because they're hiding it, but because the data to answer that question is scattered, messy, and requires statistical expertise most communities don't have on staff. Akashic Civics exists to close that gap."

---

## Slide 2: The Civic Problem

**Local criminal justice decisions shape lives — but are rarely measured**

- Arrests, charges, convictions, and sentences happen at the local level
- District attorneys, sheriffs, and judges wield enormous discretion
- Disparity by race, income, and neighborhood is well-documented nationally — but local data is fragmented
- Without measurable baselines, communities cannot advocate for change or evaluate reform

*Speaker notes:*  
"Criminal justice is local. Your district attorney decides who gets charged and with what. Your local judges set bail and sentence lengths. These decisions determine who goes to jail, who keeps their job, who stays with their family. Yet when a community asks 'are people like me being treated differently than others?' — the answer usually requires a law degree, a statistician, and months of Freedom of Information Act requests. That is a democratic failure."

---

## Slide 3: What Akashic Civics Does

**A modular open-source platform for measuring disparity**

- Ingest local case data from any jurisdiction
- Run statistical tests (Z-tests, regression, causal inference)
- Track disparities over time with streaming analysis
- Export reports for advocacy, journalism, and policy
- Available in TypeScript, Python, and R

*Speaker notes:*  
"Akashic Civics is a toolkit. It takes messy local case data — arrests, convictions, sentences — and applies rigorous statistical methods to answer: Is group A being treated differently than group B? And if so, by how much, and is the difference statistically meaningful? We built it to be modular, so a journalist in one city can use just the visualization piece, while a research university can deploy the full statistical stack."

---

# PART 2: WHAT WE BUILT — E16 THROUGH E25 (Minutes 10–25)

## Slide 4: The Enhancement Roadmap

**Ten major enhancements, E16 through E25**

| Enhancement | Focus | Languages |
|---|---|---|
| E16 | Real data integration (FBI UCR, BJS) | TypeScript |
| E17 | Advanced analytics (doubly-robust, Bayesian) | TypeScript |
| E18 | Interactive CLI analysis wizard | TypeScript |
| E19 | Jupyter Notebook interface | Python |
| E20 | Publishing/release pipeline | JavaScript |
| E21 | Extension system (plugins) | TypeScript |
| E22 | R package (regression, causal, comparison) | R |
| E23 | Streaming analysis with disparity alerts | TypeScript |
| E24 | Web dashboard UI + Express API | TypeScript/JS |
| E25 | Python statistical depth (NumPy/SciPy) | Python |

*Speaker notes:*  
"Over the last several releases, we shipped ten major enhancements. Notice the pattern: we're deliberately multi-language. A community organizer might use R. A data journalist might use Python in a Jupyter notebook. A city IT department might deploy our Express dashboard. The same statistical core powers all of them."

---

## Slide 5: Data Integration (E16) — Meeting Data Where It Lives

**FBI UCR and Bureau of Justice Statistics sources**

- Pluggable `DataSource` interface
- `FBIUCRSource` and `BJSSource` implementations
- `DataPipeline` normalizes heterogeneous inputs into a common schema
- 9 passing tests

*Implementation choice:* We normalized upstream rather than asking users to clean data. Local governments have wildly different column names and formats; our pipeline absorbs that variation.

*Speaker notes:*  
"E16 was about data ingress. We built an FBI UCR source and a BJS source because those are the two most common national datasets. But the real work was the normalization layer — taking data that arrives in different shapes and forcing it into one common schema. We made a deliberate choice: the library absorbs the mess, not the user."

---

## Slide 6: Advanced Analytics (E17) — Going Beyond Simple Comparisons

**Doubly-robust estimation + Bayesian hierarchical models**

- `DoublyRobustEstimator` — combines propensity scores with outcome regression
- `BayesianHierarchicalModel` — partial pooling across jurisdictions
- Effect sizes, confidence intervals, and uncertainty quantification

*Implementation choice:* Doubly-robust methods protect against model misspecification — if either the propensity model OR the outcome model is wrong, the estimate is still consistent.

*Speaker notes:*  
"Simple group comparisons are dangerous because they ignore confounding. If one demographic group is older or has more prior convictions, a raw conviction-rate difference might reflect that, not bias. Our doubly-robust estimator is the statistical state of the art for causal inference: it weights by propensity scores AND models the outcome. If either model is right, you get a consistent estimate. We paired it with Bayesian hierarchical models so small jurisdictions borrow strength from larger ones — critical when you're analyzing rural counties with dozens of cases, not millions."

---

## Slide 7: The Interactive CLI Wizard (E18) — Lowering the Barrier

**5-step guided analysis for non-programmers**

1. Select data source
2. Choose jurisdiction
3. Select analysis type
4. Configure parameters
5. Execute and export

*Implementation choice:* A wizard rather than raw commands. Users discover options through prompts instead of memorizing flags.

*Speaker notes:*  
"Not everyone wants to write code. The CLI wizard walks a user through an analysis in five steps — pick your data, your jurisdiction, your test, your settings, run it. It's the on-ramp. We built it because the most powerful statistical method is useless if a community advocate can't figure out how to invoke it."

---

## Slide 8: Jupyter + Python (E19 & E25) — Research Workflows

**IPython magics + real NumPy/SciPy implementations**

- `%akashic` and `%akashic_init` magics for in-notebook analysis
- `NotebookGenerator` with comparison templates
- `stats.py`: descriptive stats, Z-tests, OLS, logistic regression, doubly-robust, disconfirmation batteries, jurisdiction comparison

*Implementation choice:* Python wrappers first try in-process NumPy/SciPy, then fall back to the TypeScript CLI. Users get speed without losing interoperability.

*Speaker notes:*  
"E19 gave us Jupyter notebook integration — researchers can run disparity analysis inside a notebook they're already using. E25 went deeper: we implemented the statistical methods directly in Python using NumPy and SciPy, not just CLI wrappers. That means a researcher in a Python environment gets real OLS, real logistic regression, real causal inference — without leaving their workflow."

---

## Slide 9: R Package (E22) — Reaching Policy Researchers

**CRAN-style R package with `akashic.civics`**

- Descriptive statistics, Z-tests, OLS/logistic regression
- Doubly-robust causal estimation
- Disconfirmation battery for robustness checking
- Multi-jurisdiction disparity comparison
- `R CMD check` compliant, testthat tests, vignette

*Implementation choice:* R is the lingua franca of public policy and criminology. We built a native R package rather than expecting R users to call TypeScript.

*Speaker notes:*  
"In criminology and public policy, R is dominant. We shipped a full R package — `akashic.civics` — with the same statistical methods, wrapped in idiomatic R with roxygen documentation, testthat tests, and a vignette. An R user at a university or a state policy office can now run our methods without learning a new language."

---

## Slide 10: Streaming Analysis (E23) — Real-Time Monitoring

**Bounded-memory processing for 1M+ cases**

- `StreamProcessor` reads JSONL in chunks, never loads full dataset
- Incremental group statistics (conviction rate by race/ethnicity)
- Disparity alerts fire when conviction-rate ratio crosses a threshold
- Alert callback for external dashboards/alerts

*Implementation choice:* Bounded chunks + persistent manifest means the processor can resume after interruption and scale to datasets larger than RAM.

*Speaker notes:*  
"E23 addresses a real operational need: what if you get a new batch of cases every week and want to know immediately if disparity is widening? The stream processor reads data in bounded chunks — it never loads more than a few thousand records at a time — and computes running group statistics. If the Black conviction rate is 2x the White rate, it fires an alert. A city could run this nightly and get an early-warning signal."

---

## Slide 11: Dashboard + API (E24) — Putting Results in Front of People

**Express.js server + React-style frontend**

- `/api/health`, `/api/viz-specs`, `/api/analyze` endpoints
- Static SPA serving disparity charts and KPI cards
- Disparity ratio, conviction rates by group, sentence length visualization

*Implementation choice:* A thin API layer over the TypeScript statistical core; the frontend visualizes what the backend computes. No duplicated logic.

*Speaker notes:*  
"E24 is the dashboard — an Express server with a REST API and a browser frontend. It reads the same statistical results the CLI produces and renders them as charts: conviction rate by group, disparity ratios, sentence length distributions. The point is that the person who needs to see this — a city council member, a reporter, a community group — shouldn't have to install Node.js. They open a browser."

---

## Slide 12: Extension System (E21) + Publishing (E20) — Sustainability

**Plugin architecture and release automation**

- `ExtensionRegistry` discovers and loads DataSource, Analysis, Export, and Transformation plugins
- `publish_pipeline.js`: 11-step release cycle from lint to npm/PyPI/R
- 19 extension tests; dry-run mode for safety

*Implementation choice:* Plugins let communities add their own data sources or export formats without forking the project. The publishing pipeline ensures every release is tested and documented.

*Speaker notes:*  
"Two pieces of infrastructure deserve attention. First, the extension system: a county with a proprietary case-management system can write a plugin to ingest their data, without us ever touching their schema. Second, the publishing pipeline — 11 automated steps from linting to publishing on npm, PyPI, and CRAN. Open source dies without maintenance; this pipeline makes releases routine, not heroic."

---

# PART 3: WHY THESE IMPLEMENTATION CHOICES (Minutes 25–35)

## Slide 13: Design Principles

**Four principles guided every decision**

1. **Multi-language by design** — Meet users where they are (TS, Python, R)
2. **Statistical rigor first** — No headline numbers without confidence intervals and effect sizes
3. **Local data, local control** — Data never leaves the user's machine unless they choose to share it
4. **Composable, not monolithic** — Use the dashboard, or the CLI, or just the R package

*Speaker notes:*  
"These four principles explain every choice we made. Multi-language because a sheriff's office in Texas and a sociology professor in Oregon use different tools. Statistical rigor because disparity claims get challenged — we want our users to defend their numbers. Local control because case data is sensitive; our tools run locally by default. And composability because not everyone needs the whole stack."

---

## Slide 14: Why Doubly-Robust? Why Bayesian?

**Statistical choices with civic consequences**

- Simple rate comparisons → confounded by case mix
- Doubly-robust → consistent if either propensity or outcome model is correct
- Bayesian hierarchical → small jurisdictions get stable estimates through partial pooling

*Speaker notes:*  
"Why not just divide conviction rates? Because if one group is charged with more severe offenses, a raw difference isn't bias — it's case mix. Doubly-robust estimation adjusts for that. And Bayesian hierarchical models matter for equity: a tiny rural county with 50 cases shouldn't get the same statistical weight as a city with 50,000. Partial pooling lets small jurisdictions borrow information, so their disparity estimates aren't dominated by noise."

---

## Slide 15: Why Stream, Why Alert?

**Operationalizing disparity monitoring**

- Batch analysis answers "what happened?"
- Streaming answers "is it happening right now?"
- Alert thresholds → early warning for advocates and oversight bodies

*Speaker notes:*  
"Most disparity analysis is retrospective: 'last year, Black defendants were convicted at higher rates.' That's useful, but it's history. Streaming turns disparity monitoring into an operational practice. If a new policy takes effect and the disparity ratio jumps, you know within days, not years. That's the difference between studying injustice and interrupting it."

---

# PART 4: CIVIC IMPACT — UNDERSTANDING LOCAL LEADERS (Minutes 35–42)

## Slide 16: From Data to Local Leadership Accountability

**What the tools reveal about decision-makers**

| Decision Point | Who Decides | What Akashic Measures |
|---|---|---|
| Charging | District Attorney | Conviction rate by demographic, controlling for charge severity |
| Bail / Pretrial | Judge | Pretrial detention disparity |
| Sentencing | Judge | Sentence length disparity, controlling for offense and priors |
| Diversion | Prosecutor / Court | Disposition flow (convicted vs. dismissed vs. diverted) |

*Speaker notes:*  
"This is the heart of the civic impact. Every cell in this table is a decision point where a local official exercises discretion. Our tools let a community measure each one. Did your DA charge a particular demographic more aggressively for the same offense? Did your judge set higher bail? Did your court divert fewer people to treatment? These aren't abstract statistics — they're specific actions by specific people who hold public office."

---

## Slide 17: A Concrete Scenario

**Mid-sized county, 12,000 cases/year**

- Community suspects racial disparity in convictions
- They load 3 years of case data into Akashic Civics
- Doubly-robust analysis: Black defendants convicted at 1.4x the rate of White defendants, controlling for charge severity and priors (p < 0.01)
- Streaming alert: disparity ratio rose from 1.2x to 1.6x after a new DA took office
- Community presents findings at public safety committee hearing
- DA adopts new charging guidelines; disparity drops to 1.1x in next quarter

*Speaker notes:*  
"Here's what this looks like in practice. Imagine a county of 300,000 people. A community group loads three years of cases. Our doubly-robust analysis shows Black defendants convicted at 1.4 times the rate of White defendants, even after accounting for charge severity and prior record. Their streaming monitor shows the gap widened after a new district attorney took office. They take those numbers to a public hearing. The DA responds with new charging guidelines. Next quarter, the disparity falls to 1.1x. That's democracy working — but it only works if the community had the data to ask the question."

---

## Slide 18: Promoting Democracy

**How measurement strengthens democratic institutions**

- **Transparency:** Disparity metrics are no longer locked in prosecutors' spreadsheets
- **Participation:** Community groups can analyze the same data as officials
- **Accountability:** Elected leaders can be evaluated on measurable outcomes
- **Reform evaluation:** Did the new policy actually reduce disparity? We can tell.

*Speaker notes:*  
"At its core, this is a democracy project. Democracy requires that people can see what their government is doing and judge whether it's fair. Right now, criminal justice discretion is largely invisible. Akashic Civics makes it visible. When a community can measure disparity, they can participate meaningfully in public debates, hold elected officials accountable, and know whether reforms are working. Data doesn't replace values or political judgment — but it gives both a foundation to stand on."

---

# PART 5: CLOSING (Minutes 42–45)

## Slide 19: Get Involved

**Akashic Civics is open source and ready to use**

- Install: `npm install akashic-civics` or `pip install akashic-civics-py` or `R CMD INSTALL`
- Run the wizard: `akashic wizard`
- Launch the dashboard: `akashic dashboard`
- Contribute: extensions, data sources, visualizations, documentation
- GitHub: github.com/elijah/akashic-civics

*Speaker notes:*  
"We're not asking you to trust us. We're asking you to use it, break it, extend it, and tell us what's missing. Install it in your language of choice. Run the wizard on your local data. Launch the dashboard and share it. If your county uses a case system we don't support yet, write an extension plugin. This project only works if communities adopt it."

---

## Slide 20: Thank You

**Questions & Discussion**

- How could your community use disparity data?
- What local decisions most need measurement?
- What data sources should we integrate next?

*Speaker notes:*  
"Thank you. I'll close where we started: criminal justice is local, and fairness is measurable. We built Akashic Civics so that no community has to wonder whether their local leaders are treating people fairly — they can know. Let's discuss how this can work in your jurisdiction."

---

## Appendix: Speaker Timing Cheat Sheet

| Segment | Slides | Minutes |
|---|---|---|
| Opening & Problem | 1–3 | 0–10 |
| What We Built (E16–E25) | 4–12 | 10–25 |
| Design Principles & Tradeoffs | 13–15 | 25–35 |
| Civic Impact & Local Leaders | 16–18 | 35–42 |
| Closing & Call to Action | 19–20 | 42–45 |

**Total:** 45 minutes

---

## Appendix: Demo Script (Optional, if time permits)

If you have a live internet connection and sample data:

1. **2 minutes:** `npm install -g akashic-civics` then `akashic wizard` — walk through selecting a synthetic dataset and running a disparity analysis.
2. **2 minutes:** Open the dashboard at `localhost:3000` and show the disparity ratio visualization.
3. **1 minute:** Run a Python one-liner: `akashic-civics run-ztest --p1 0.45 --n1 1000 --p2 0.30 --n2 1000`

*Skip the demo if running over time; the slides stand alone.*
