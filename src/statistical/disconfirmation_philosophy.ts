/**
 * Disconfirmation Philosophy
 * 
 * Encodes the philosophical and epistemological grounding of disconfirmation
 * testing in machine-readable form. This module is the single source of truth
 * for WHY each test exists, what threat it guards against, and how failures
 * should be interpreted.
 * 
 * The narrative version of this content lives in:
 *   docs/methodology/disconfirmation_philosophy.md
 * 
 * Keeping it in code ensures that generated documentation, remediation
 * suggestions, and report interpretations are always grounded in the same
 * rationale - not re-derived (and potentially mis-derived) at each call site.
 */

// ============================================================================
// Core Philosophical Frameworks
// ============================================================================

/**
 * Karl Popper's falsificationism - the foundation of disconfirmation testing
 */
export interface FalsificationPrinciple {
  name: string;
  source: string;
  statement: string;
  implication: string;
}

/**
 * The key epistemological distinction this system is built on
 */
export interface EpistemologicalDistinction {
  confirmatory: {
    label: string;
    question: string;
    method: string;
    vulnerability: string;
    evidenceProduced: string;
  };
  disconfirmatory: {
    label: string;
    question: string;
    method: string;
    vulnerability: string;
    evidenceProduced: string;
  };
}

/**
 * The threat-to-validity each test addresses
 */
export interface ThreatAddressed {
  threat: string;
  description: string;
  consequence: string;
}

/**
 * Why a specific test matters, in plain language
 */
export interface TestPhilosophy {
  testId: string;
  name: string;
  title: string;
  coreQuestion: string;
  whatItGuardsAgainst: string[];
  rationale: string;
  whyItMatters: string;
  failureMeaning: string;
  passMeaning: string;
  evidentiaryValue: string;
}

// ============================================================================
// Content Definitions
// ============================================================================

export const FALSIFICATION_PRINCIPLE: FalsificationPrinciple = {
  name: 'Falsificationism',
  source: 'Karl Popper, "Conjectures and Refutations" (1963)',
  statement:
    'A theory which is not refutable by any conceivable event is non-scientific. ' +
    'Irrefutability is not a virtue of a theory but a vice.',
  implication:
    'The disconfirmation protocol operationalizes this: we attempt to refute our own ' +
    'findings before accepting them, and report the attempts regardless of outcome.'
};

export const EPISTEMOLOGICAL_DISTINCTION: EpistemologicalDistinction = {
  confirmatory: {
    label: 'Confirmation (the default)',
    question: 'Can I find evidence supporting my hypothesis?',
    method: 'Run analyses until one produces p < 0.05; report that analysis.',
    vulnerability:
      'P-hacking, specification search, publication bias, and the file-drawer effect ' +
      'produce a literature with an estimated >50% false positive rate.',
    evidenceProduced:
      'A single "significant" result with no information about how hard we looked for failure.'
  },
  disconfirmatory: {
    label: 'Disconfirmation (this system)',
    question: 'Can I break my own hypothesis with serious tests?',
    method:
      'Subject the finding to independent falsification attempts covering every major ' +
      'threat to validity, then report the full protocol.',
    vulnerability:
      'A finding that passes all tests may still be wrong in ways we have not conceived; ' +
      'disconfirmation raises the evidential bar, it does not achieve certainty.',
    evidenceProduced:
      'A graded credibility assessment showing which threats were ruled out, ' +
      'which remain open, and by how much the finding is qualified.'
  }
};

/**
 * The six tests, each with its philosophical grounding
 */
export const TEST_PHILOSOPHY: Record<string, TestPhilosophy> = {
  placebo: {
    testId: 'placebo',
    name: 'Placebo Tests',
    title: 'Guarding Against False Positive Bias',
    coreQuestion: 'Does my methodology detect effects where I know none exist?',
    whatItGuardsAgainst: [
      'P-hacking and flexible analysis paths',
      'Model specifications that systematically overfit',
      'Significance thresholds that are not respected',
      'Any methodological artifact producing "significance" under the null'
    ],
    rationale:
      'Applying the identical analysis pipeline to a period or outcome where the effect ' +
      'is known to be null reveals the pipeline\'s false positive rate. This is the ' +
      'single most important calibration of any empirical method.',
    whyItMatters:
      'If the methodology finds "racial bias" in a context where none is hypothesized, ' +
      'every finding it produces is suspect until the bias is corrected. No other test ' +
      'can repair this, because the other tests all assume the methodology is sound.',
    failureMeaning:
      'The methodology has systematic false positive bias. No findings should be reported ' +
      'until the pipeline is corrected and the placebo test re-run.',
    passMeaning:
      'The methodology is calibrated for the null. This does not guarantee truth, but it ' +
      'rules out the most common way empirical work goes wrong.',
    evidentiaryValue:
      'Foundational. A placebo failure invalidates everything downstream.'
  },
  spec_sensitivity: {
    testId: 'spec_sensitivity',
    name: 'Specification Sensitivity',
    title: 'Guarding Against Analytical Fragility',
    coreQuestion: 'Does my finding survive reasonable analytical choices?',
    whatItGuardsAgainst: [
      'Cherry-picking model specifications',
      '"Vibration of effects" - results that shift with minor analytic tweaks',
      'Reporting only the one specification that "works"',
      'Degrees-of-freedom decisions made after seeing the data'
    ],
    rationale:
      'A genuine phenomenon should be detectable by multiple reasonable analytical ' +
      'approaches. If a result only appears under one specific set of controls, one ' +
      'model family, and one exclusion rule, the result is an artifact of that ' +
      'specification rather than a property of the data.',
    whyItMatters:
      'Specification search is invisible in the final write-up but determines whether a ' +
      'finding exists at all. Making the search space explicit and reporting the full ' +
      'distribution of results is the only honest response.',
    failureMeaning:
      'The finding is analytically fragile. Report the range of estimates across ' +
      'specifications rather than a point estimate, or reject the finding.',
    passMeaning:
      'The effect is robust to reasonable analytic variation. It may still be non-causal.',
    evidentiaryValue:
      'High. Distinguishes a stable finding from a lucky specification.'
  },
  negative_controls: {
    testId: 'negative_controls',
    name: 'Negative Control Tests',
    title: 'Distinguishing Bias from Methodological Artifact',
    coreQuestion: 'Does my methodology find bias where it should not?',
    whatItGuardsAgainst: [
      'Systemic methodological bias (model misspecification creating spurious group differences)',
      'Unmeasured confounding that affects all outcomes similarly',
      'Data quality issues that correlate with group membership',
      'Encoding artifacts in the outcome or feature pipeline'
    ],
    rationale:
      'If a claim of racial bias in sentencing is accompanied by an equally strong ' +
      '"racial bias" in parking citations, the signal is being generated by the ' +
      'methodology, not the domain. Genuine bias is domain-specific; artifact is not.',
    whyItMatters:
      'This is the only test that directly probes whether the measured effect is a ' +
      'property of the world or of the instrument. It is the closest analogue to a ' +
      'positive control in laboratory science.',
    failureMeaning:
      'Systemic methodological bias is suspected. Either the main effect or the ' +
      'negative control result is artifactual; investigate data quality and model form.',
    passMeaning:
      'The effect is domain-specific, consistent with a genuine mechanism rather than ' +
      'a pipeline artifact.',
    evidentiaryValue:
      'Critical for credibility. Without it, bias and artifact are indistinguishable.'
  },
  out_of_sample: {
    testId: 'out_of_sample',
    name: 'Out-of-Sample Validation',
    title: 'Guarding Against Overfitting',
    coreQuestion: 'Does my finding generalize to data it has not seen?',
    whatItGuardsAgainst: [
      'Overfitting to sample-specific noise',
      'Capitalizing on chance correlations in the estimation sample',
      'Reporting in-sample fit as though it were predictive accuracy',
      'Models with more flexibility than the data can support'
    ],
    rationale:
      'Any model with sufficient degrees of freedom can "explain" its training data. ' +
      'Split-sample validation is the closest available approximation to experimental ' +
      'replication in observational social science.',
    whyItMatters:
      'Out-of-sample replication is one of the strongest single pieces of evidence ' +
      'available without an experiment. A finding that replicates has substantially ' +
      'higher evidential value than one that does not.',
    failureMeaning:
      'The finding may be data-specific and non-generalizable. Report it as "not ' +
      'validated out-of-sample" or as exploratory only.',
    passMeaning:
      'The effect generalizes beyond the estimation sample.',
    evidentiaryValue:
      'Substantial. The closest thing to replication available to observational work.'
  },
  temporal_robustness: {
    testId: 'temporal_robustness',
    name: 'Temporal Robustness',
    title: 'Guarding Against Transient Artifacts',
    coreQuestion: 'Is this a persistent pattern or a one-time anomaly?',
    whatItGuardsAgainst: [
      'Single-period anomalies (one judge, one policy change, one election cycle)',
      'Period-specific confounders',
      'Regression to the mean',
      'Drawing the target around the bullet hole after seeing the data'
    ],
    rationale:
      'Systemic bias is, by definition, systemic: it persists across time. A pattern ' +
      'present in 2021 but absent in 2019, 2020, and 2022 is driven by something ' +
      'specific to 2021.',
    whyItMatters:
      'Temporal persistence is a necessary (not sufficient) condition for systemic ' +
      'bias. It also protects against a common failure mode: reporting a single ' +
      'conspicuous period as a trend.',
    failureMeaning:
      'The finding may be period-specific. Investigate what was different about the ' +
      'period in which the effect appears.',
    passMeaning:
      'The pattern is stable across administrations and time, consistent with a ' +
      'systemic mechanism.',
    evidentiaryValue:
      'High, and cheap relative to its diagnostic power.'
  },
  alternative_explanations: {
    testId: 'alternative_explanations',
    name: 'Alternative Explanation Testing',
    title: 'The Core of Causal Inference',
    coreQuestion: 'What else could explain this?',
    whatItGuardsAgainst: [
      'Omitted variable bias - the dominant threat to causal inference in observational data',
      'Confounding - third variables correlated with both group and outcome',
      'Selection bias - differential entry into the analyzed population',
      'Measurement error - differential data quality across groups',
      'Reverse causation - the outcome influencing the exposure',
      'Aggregation bias - Simpson\'s paradox across strata'
    ],
    rationale:
      'In observational data we never have random assignment. Every observed disparity ' +
      'has some alternative explanation. The question is never "is there another ' +
      'explanation" but "do the data support the alternatives over the causal claim." ' +
      'This is the test that does the actual epistemic work.',
    whyItMatters:
      'This is where most bias findings fail replication - not because the disparity ' +
      'is illusory, but because it was attributable to something else. Testing ' +
      'alternatives systematically is what distinguishes a causal claim from a ' +
      'descriptive one.',
    failureMeaning:
      'A specific alternative explains the effect. The finding must be attributed to ' +
      'that factor rather than to bias, or rejected.',
    passMeaning:
      'Measured alternatives do not explain the effect. Unmeasured alternatives may ' +
      'still exist, and this must be stated explicitly in any report.',
    evidentiaryValue:
      'Highest. This is the test that converts description into explanation.'
  }
};

/**
 * Common mischaracterizations of disconfirmation testing, with corrections
 */
export interface Misconception {
  myth: string;
  correction: string;
}

export const COMMON_MISCONCEPTIONS: Misconception[] = [
  {
    myth: 'Disconfirmation is just being negative.',
    correction:
      'Disconfirmation is constructive. It tells you which findings are solid enough to ' +
      'build on, which need more data, and specifically why a finding might be wrong. ' +
      'It is the difference between "your argument is bad" and "your argument fails ' +
      'these specific tests for these specific reasons."'
  },
  {
    myth: 'If I pass all tests, the finding is proven.',
    correction:
      'No finding is ever proven in observational social science. Passing all tests ' +
      'means the finding is robust to known threats and is not explained by measured ' +
      'alternatives. It warrants provisional acceptance, not certainty.'
  },
  {
    myth: 'Disconfirmation makes it harder to find bias.',
    correction:
      'It makes it harder to falsely claim bias, and thereby increases the credibility ' +
      'of real findings. Genuine systemic bias survives these tests precisely because ' +
      'systemic patterns are robust to specification, persistent over time, and ' +
      'domain-specific.'
  },
  {
    myth: 'This is too strict; we will never find anything.',
    correction:
      'The thresholds are calibrated to standard practice: placebo at p >= 0.05, ' +
      'specification consistency at 80%, out-of-sample tolerance at 20% effect size, ' +
      'temporal consistency at 75% of periods. These are the same standards used in ' +
      'clinical trials and econometrics.'
  },
  {
    myth: 'A failed test means the finding is false.',
    correction:
      'A failed test means the finding is not supported under that particular threat. ' +
      'It is a statement about robustness, not about truth in either direction.'
  }
];

/**
 * The legal-context rationale: why disconfirmation has special force in
 * analysis of legal institutions
 */
export interface LegalContextRationale {
  analogy: string;
  burdenOfProof: string;
  defaultStance: string;
  transparencyImplication: string;
}

export const LEGAL_CONTEXT: LegalContextRationale = {
  analogy:
    'Disconfirmation testing is the statistical analogue of cross-examination. Legal ' +
    'professionals understand that a witness\'s account must survive adversarial ' +
    'testing before it is accepted; the same standard applies to an empirical claim ' +
    'about the legal system itself.',
  burdenOfProof:
    'The burden of proof sits with the analyst. The claim is not "I found a p-value ' +
    'below 0.05" but "this finding survived every falsification attempt I could ' +
    'design."',
  defaultStance:
    'Skepticism, not belief. The system is designed so that a null result is the ' +
    'default and a disparity claim must earn its way past that default.',
  transparencyImplication:
    'The protocol forces disclosure of what was tested. Any reviewer - judge, ' +
    'opposing counsel, journalist, or community member - can audit exactly which ' +
    'threats were addressed and which remain open.'
};

// ============================================================================
// Accessors
// ============================================================================

/**
 * Get the philosophy entry for a test
 */
export function getTestPhilosophy(testId: string): TestPhilosophy | undefined {
  return TEST_PHILOSOPHY[testId];
}

/**
 * Get all test philosophies in protocol order
 */
export function getAllTestPhilosophies(): TestPhilosophy[] {
  return [
    TEST_PHILOSOPHY.placebo,
    TEST_PHILOSOPHY.spec_sensitivity,
    TEST_PHILOSOPHY.negative_controls,
    TEST_PHILOSOPHY.out_of_sample,
    TEST_PHILOSOPHY.temporal_robustness,
    TEST_PHILOSOPHY.alternative_explanations
  ];
}

/**
 * Get a plain-language explanation of why disconfirmation testing matters,
 * suitable for inclusion in a report header or for a non-technical reader.
 */
export function getCoreRationale(): string {
  return (
    'This analysis was subjected to a disconfirmation protocol: a series of independent ' +
    'attempts to refute the finding using the same rigor normally reserved for ' +
    'supporting it. ' +
    'The purpose is not to "prove" a disparity but to establish how much of the ' +
    'observed pattern survives the known ways statistical findings go wrong. ' +
    'A finding that fails these tests is not thereby proven false; it is shown to be ' +
    'unvalidated, and is reported with that qualification attached.'
  );
}
