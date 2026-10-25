import {
  CodeLanguage,
  ChartType,
  generateRCode,
  generatePythonCode,
  generateJavaScriptCode,
  generateAllCode,
  recommendVisualizations,
  interpretResult,
  scoreResponseConfidence,
  generateMultiModalResponse
} from '../multi_modal_responses';
import { RAnalysisResult } from '../../r-interface/r_bridge';

function makeResult(overrides: Partial<RAnalysisResult> = {}): RAnalysisResult {
  return {
    analysis_type: 'logistic_regression',
    effect_size: 0.42,
    p_value: 0.023,
    confidence_interval: [0.15, 0.68],
    odds_ratio: 1.52,
    sample_size: 1200,
    model_type: 'logit',
    ...overrides
  };
}

describe('Multi-Modal Responses', () => {
  describe('generateRCode', () => {
    test('returns an R code artifact', () => {
      const artifact = generateRCode(makeResult());
      expect(artifact.language).toBe(CodeLanguage.R);
      expect(artifact.filename).toBe('analysis.R');
      expect(artifact.code).toContain('glm(');
      expect(artifact.code).toContain('logistic_regression');
    });

    test('includes disconfirmation checks', () => {
      const artifact = generateRCode(makeResult());
      expect(artifact.code).toContain('Placebo');
      expect(artifact.code).toContain('spec');
    });

    test('uses supplied variable names', () => {
      const artifact = generateRCode(makeResult(), 'conviction', 'race');
      expect(artifact.code).toContain('conviction');
      expect(artifact.code).toContain('race');
    });
  });

  describe('generatePythonCode', () => {
    test('returns a Python code artifact', () => {
      const artifact = generatePythonCode(makeResult());
      expect(artifact.language).toBe(CodeLanguage.PYTHON);
      expect(artifact.filename).toBe('analysis.py');
      expect(artifact.code).toContain('statsmodels');
      expect(artifact.code).toContain('smf.logit');
    });

    test('interpolates variable names into the model formula', () => {
      const artifact = generatePythonCode(makeResult(), 'outcome_var', 'group_var');
      expect(artifact.code).toContain('outcome_var ~ group_var');
    });

    test('declares required packages', () => {
      const artifact = generatePythonCode(makeResult());
      expect(artifact.requiresPackages).toContain('statsmodels');
      expect(artifact.requiresPackages).toContain('numpy');
    });
  });

  describe('generateJavaScriptCode', () => {
    test('returns a JavaScript code artifact', () => {
      const artifact = generateJavaScriptCode(makeResult());
      expect(artifact.language).toBe(CodeLanguage.JAVASCRIPT);
      expect(artifact.filename).toBe('analysis.js');
      expect(artifact.code).toContain('runLogisticRegression');
    });

    test('interpolates variable names', () => {
      const artifact = generateJavaScriptCode(makeResult(), 'conviction', 'race');
      expect(artifact.code).toContain("'conviction'");
      expect(artifact.code).toContain("'race'");
    });
  });

  describe('generateAllCode', () => {
    test('generates artifacts in all three languages', () => {
      const artifacts = generateAllCode(makeResult());
      expect(artifacts.length).toBe(3);
      expect(artifacts.map(a => a.language)).toEqual([
        CodeLanguage.R,
        CodeLanguage.PYTHON,
        CodeLanguage.JAVASCRIPT
      ]);
    });
  });

  describe('recommendVisualizations', () => {
    test('recommends a time series when a time variable exists', () => {
      const recs = recommendVisualizations(makeResult(), true, true);
      expect(recs.some(r => r.chartType === ChartType.TIME_SERIES)).toBe(true);
    });

    test('omits time series when no time variable exists', () => {
      const recs = recommendVisualizations(makeResult(), true, false);
      expect(recs.some(r => r.chartType === ChartType.TIME_SERIES)).toBe(false);
    });

    test('recommends a forest plot always', () => {
      const recs = recommendVisualizations(makeResult());
      expect(recs.some(r => r.chartType === ChartType.FOREST_PLOT)).toBe(true);
    });

    test('every recommendation has accessibility notes', () => {
      const recs = recommendVisualizations(makeResult(), true, true);
      for (const r of recs) {
        expect(r.accessibilityNotes.length).toBeGreaterThan(0);
        expect(r.title.length).toBeGreaterThan(0);
        expect(r.rationale.length).toBeGreaterThan(0);
      }
    });

    test('marks the analysis type in the rationale', () => {
      const recs = recommendVisualizations(makeResult(), true, true);
      const timeSeries = recs.find(r => r.chartType === ChartType.TIME_SERIES);
      expect(timeSeries?.rationale).toContain('logistic regression');
    });
  });

  describe('interpretResult', () => {
    test('reports significance for a significant result', () => {
      const interp = interpretResult(makeResult());
      expect(interp.headline).toContain('statistically significant');
      expect(interp.significanceDescription).toContain('significant at alpha = 0.05');
    });

    test('reports non-significance for a null result', () => {
      const interp = interpretResult(makeResult({ p_value: 0.4 }));
      expect(interp.headline).toContain('does not show a statistically significant');
      expect(interp.uncertaintyLevel).toBe('high');
    });

    test('includes the confidence interval', () => {
      const interp = interpretResult(makeResult());
      expect(interp.confidenceDescription).toContain('0.15');
      expect(interp.confidenceDescription).toContain('0.68');
    });

    test('always lists caveats including the causal caveat', () => {
      const interp = interpretResult(makeResult());
      expect(interp.caveats.some(c => c.includes('causation'))).toBe(true);
    });

    test('flags a confidence interval that crosses the null', () => {
      const interp = interpretResult(makeResult({
        p_value: 0.2,
        confidence_interval: [-0.1, 0.4]
      }));
      expect(interp.caveats.some(c => c.includes('includes the null'))).toBe(true);
    });

    test('recommends follow-up analyses', () => {
      const interp = interpretResult(makeResult());
      expect(interp.recommendedFollowUps.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('scoreResponseConfidence', () => {
    test('gives higher confidence to a significant tight result', () => {
      const strong = interpretResult(makeResult({ p_value: 0.001, confidence_interval: [0.3, 0.5] }));
      const weak = interpretResult(makeResult({ p_value: 0.4, confidence_interval: [-0.2, 0.6] }));
      const strongScore = scoreResponseConfidence(makeResult({ p_value: 0.001, confidence_interval: [0.3, 0.5] }), strong);
      const weakScore = scoreResponseConfidence(makeResult({ p_value: 0.4, confidence_interval: [-0.2, 0.6] }), weak);
      expect(strongScore).toBeGreaterThan(weakScore);
    });

    test('stays within 0 to 1', () => {
      const result = makeResult();
      const score = scoreResponseConfidence(result, interpretResult(result));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    test('caps confidence at 0.5 for high uncertainty', () => {
      const result = makeResult({ p_value: 0.4, confidence_interval: [-0.3, 0.7] });
      const interp = interpretResult(result);
      expect(interp.uncertaintyLevel).toBe('high');
      expect(scoreResponseConfidence(result, interp)).toBeLessThanOrEqual(0.5);
    });
  });

  describe('generateMultiModalResponse', () => {
    test('returns a complete response', () => {
      const response = generateMultiModalResponse(makeResult(), { analysisName: 'Sentencing disparity' });
      expect(response.code.length).toBe(3);
      expect(response.visualizations.length).toBeGreaterThan(0);
      expect(response.interpretation.headline).toContain('Sentencing disparity');
      expect(response.responseConfidence).toBeGreaterThan(0);
    });

    test('honors hasTimeVariable option', () => {
      const response = generateMultiModalResponse(makeResult(), { hasTimeVariable: true });
      expect(response.visualizations.some(v => v.chartType === ChartType.TIME_SERIES)).toBe(true);
    });
  });
});
