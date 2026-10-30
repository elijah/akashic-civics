/**
 * Tests for E31: Longitudinal Panel Data Methods
 */

import {
  FixedEffectsPanel as FEPanel,
  FirstDifferencePanel as FDpanel,
  RandomEffectsPanel as REPanel,
  PanelDataUtils,
  estimateFixedEffects as estFE,
  estimateFirstDifference as estFD,
  estimateRandomEffects as estRE,
  PanelObservation
} from '../e_31_panel_data';

describe('E31: Longitudinal Panel Data Methods', () => {
  let balancedObservations: PanelObservation[];
  let unbalancedObservations: PanelObservation[];

  beforeEach(() => {
    // Create balanced panel: 3 entities, 4 time periods
    balancedObservations = [];
    const entities = ['LA-County', 'SF-County', 'Cook-County'];
    const times = [2019, 2020, 2021, 2022];

    entities.forEach((entityId, ei) => {
      times.forEach((time, ti) => {
        const baseOutcome = 0.5 + ei * 0.05 + ti * 0.02 + (ei + ti) * 0.01;
        balancedObservations.push({
          entityId,
          time,
          outcome: baseOutcome,
          predictors: {
            budget: 100 + ei * 20 + ti * 5 + (ei * ti) * 0.5,
            staff: 50 + ei * 10 + ti * 3,
            caseloadPerOfficer: 20 - ei * 3 + ti * 0.5 + (ei * ti) * 0.2
          },
          group: entityId.startsWith('LA') ? 'urban' : 'suburban'
        });
      });
    });

    // Create unbalanced panel
    unbalancedObservations = [
      { entityId: 'A', time: 1, outcome: 10, predictors: { x1: 1, x2: 2 } },
      { entityId: 'A', time: 2, outcome: 15, predictors: { x1: 2, x2: 4 } },
      { entityId: 'A', time: 3, outcome: 20, predictors: { x1: 3, x2: 9 } },
      { entityId: 'B', time: 1, outcome: 12, predictors: { x1: 1.5, x2: 2.5 } },
      { entityId: 'B', time: 2, outcome: 18, predictors: { x1: 2.5, x2: 6.25 } },
      { entityId: 'C', time: 1, outcome: 8, predictors: { x1: 0.8, x2: 1.8 } },
      { entityId: 'C', time: 2, outcome: 14, predictors: { x1: 1.8, x2: 3.6 } },
      { entityId: 'C', time: 3, outcome: 22, predictors: { x1: 3.2, x2: 8.48 } },
      { entityId: 'C', time: 4, outcome: 25, predictors: { x1: 4, x2: 12.32 } }
    ];
  });

  describe('FixedEffectsPanel', () => {
    it('should estimate fixed effects model', () => {
      const panel = new FEPanel(balancedObservations);
      const result = panel.estimate('outcome', ['budget', 'staff', 'caseloadPerOfficer']);

      expect(result.model).toBe('fixed_effects');
      expect(result.n).toBe(3);
      expect(result.t).toBe(4);
      expect(result.k).toBe(4);
      expect(result.convergence).toBe(true);
      expect(result.coefficients).toHaveProperty('intercept');
      expect(result.coefficients).toHaveProperty('budget');
      expect(result.coefficients).toHaveProperty('staff');
      expect(result.coefficients).toHaveProperty('caseloadPerOfficer');
      expect(Object.keys(result.standardErrors).length).toBe(4);
      expect(Object.keys(result.tStatistics).length).toBe(4);
      expect(Object.keys(result.pValues).length).toBe(4);
      expect(Object.keys(result.confidenceIntervals).length).toBe(4);
    });

    it('should compute within R-squared', () => {
      const panel = new FEPanel(balancedObservations);
      const result = panel.estimate('outcome', ['budget']);

      expect(result.withinR2).toBeDefined();
    });

    it('should compute standard errors', () => {
      const panel = new FEPanel(balancedObservations);
      const result = panel.estimate('outcome', ['budget', 'staff']);

      Object.values(result.standardErrors).forEach(se => {
        expect(se).toBeGreaterThanOrEqual(0);
      });
    });

    it('should compute t-statistics correctly', () => {
      const panel = new FEPanel(balancedObservations);
      const result = panel.estimate('outcome', ['budget']);

      Object.entries(result.coefficients).forEach(([varName, coef]) => {
        const se = result.standardErrors[varName];
        const tStat = result.tStatistics[varName];
        if (se > 0) {
          expect(tStat).toBeCloseTo(coef / se, 5);
        }
      });
    });

    it('should compute p-values in valid range', () => {
      const panel = new FEPanel(balancedObservations);
      const result = panel.estimate('outcome', ['budget', 'staff']);

      Object.values(result.pValues).forEach(p => {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      });
    });

    it('should compute confidence intervals', () => {
      const panel = new FEPanel(balancedObservations);
      const result = panel.estimate('outcome', ['budget']);

      Object.entries(result.confidenceIntervals).forEach(([varName, [lower, upper]]) => {
        expect(lower).toBeLessThan(upper);
        const coef = result.coefficients[varName];
        expect(coef).toBeGreaterThanOrEqual(lower);
        expect(coef).toBeLessThanOrEqual(upper);
      });
    });

    it('should handle unbalanced panel', () => {
      const panel = new FEPanel(unbalancedObservations);
      const result = panel.estimate('outcome', ['x1', 'x2']);

      expect(result.model).toBe('fixed_effects');
      expect(result.convergence).toBe(true);
    });
  });

  describe('FirstDifferencePanel', () => {
    it('should estimate first-difference model', () => {
      const panel = new FDpanel(balancedObservations);
      const result = panel.estimate('outcome', ['budget', 'staff']);

      expect(result.model).toBe('first_difference');
      expect(result.convergence).toBe(true);
      expect(result.coefficients).toHaveProperty('intercept');
      expect(result.coefficients).toHaveProperty('budget');
      expect(result.coefficients).toHaveProperty('staff');
    });

    it('should produce n-1 observations per entity after differencing', () => {
      const panel = new FDpanel(balancedObservations);
      const result = panel.estimate('outcome', ['budget']);

      // 3 entities * 3 diffs = 9 obs
      expect(result.n).toBe(9);
    });

    it('should compute R-squared for differenced model', () => {
      const panel = new FDpanel(balancedObservations);
      const result = panel.estimate('outcome', ['budget', 'staff']);

      expect(result.rSquared).toBeDefined();
      expect(result.rSquared).toBeGreaterThanOrEqual(0);
      expect(result.rSquared).toBeLessThanOrEqual(1);
    });
  });

  describe('RandomEffectsPanel', () => {
    it('should estimate between model', () => {
      const panel = new REPanel(balancedObservations);
      const result = panel.estimate('outcome', ['budget', 'staff']);

      expect(result.model).toBe('between');
      expect(result.convergence).toBe(true);
      expect(result.betweenR2).toBeDefined();
      expect(result.betweenR2).toBeGreaterThanOrEqual(0);
    });

    it('should compute entity-level coefficients', () => {
      const panel = new REPanel(balancedObservations);
      const result = panel.estimate('outcome', ['budget']);

      expect(result.coefficients).toHaveProperty('intercept');
      expect(result.coefficients).toHaveProperty('budget');
    });
  });

  describe('PanelDataUtils', () => {
    describe('entitySummary', () => {
      it('should compute entity-level summary statistics', () => {
        const summary = PanelDataUtils.entitySummary(balancedObservations);

        expect(Object.keys(summary).length).toBe(3);
        expect(summary['LA-County']).toBeDefined();
        expect(summary['LA-County'].n).toBe(4);
        expect(summary['LA-County'].mean).toBeCloseTo(
          balancedObservations.filter(o => o.entityId === 'LA-County')
            .reduce((sum, o) => sum + o.outcome, 0) / 4,
          5
        );
        expect(summary['LA-County'].variance).toBeGreaterThanOrEqual(0);
        expect(summary['LA-County'].min).toBeLessThanOrEqual(summary['LA-County'].max);
      });

      it('should handle single entity', () => {
        const singleEntity = balancedObservations.filter(o => o.entityId === 'LA-County');
        const summary = PanelDataUtils.entitySummary(singleEntity);

        expect(Object.keys(summary).length).toBe(1);
        expect(summary['LA-County'].n).toBe(4);
      });
    });

    describe('getTimeSeries', () => {
      it('should extract time series per entity', () => {
        const timeSeries = PanelDataUtils.getTimeSeries(balancedObservations);

        expect(Object.keys(timeSeries).length).toBe(3);
        expect(timeSeries['LA-County'].length).toBe(4);
        expect(timeSeries['SF-County'].length).toBe(4);
        expect(timeSeries['Cook-County'].length).toBe(4);
      });

      it('should return outcomes in time order', () => {
        const timeSeries = PanelDataUtils.getTimeSeries(balancedObservations);

        // LA-County outcomes should be increasing (baseOutcome = 0.5 + 0 + ti * 0.02 + ...)
        const laSeries = timeSeries['LA-County'];
        expect(laSeries[0]).toBeLessThan(laSeries[laSeries.length - 1]);
      });
    });

    describe('isBalanced', () => {
      it('should identify balanced panel', () => {
        expect(PanelDataUtils.isBalanced(balancedObservations)).toBe(true);
      });

      it('should identify unbalanced panel', () => {
        expect(PanelDataUtils.isBalanced(unbalancedObservations)).toBe(false);
      });
    });
  });

  describe('convenience functions', () => {
    it('estimateFixedEffects should return fixed effects result', () => {
      const result = estFE(balancedObservations, 'outcome', ['budget', 'staff']);
      expect(result.model).toBe('fixed_effects');
      expect(result.coefficients).toHaveProperty('budget');
    });

    it('estimateFirstDifference should return first difference result', () => {
      const result = estFD(balancedObservations, 'outcome', ['budget']);
      expect(result.model).toBe('first_difference');
    });

    it('estimateRandomEffects should return between result', () => {
      const result = estRE(balancedObservations, 'outcome', ['budget']);
      expect(result.model).toBe('between');
    });
  });

  describe('edge cases', () => {
    it('should handle single time period', () => {
      const singlePeriod = balancedObservations.filter(o => o.time === 2019);
      expect(() => {
        const panel = new FEPanel(singlePeriod);
        panel.estimate('outcome', ['budget']);
      }).not.toThrow();
    });

    it('should handle single entity', () => {
      const singleEntity = balancedObservations.filter(o => o.entityId === 'LA-County');
      expect(() => {
        const panel = new FEPanel(singleEntity);
        panel.estimate('outcome', ['budget', 'staff']);
      }).not.toThrow();
    });

    it('should handle missing predictor values', () => {
      const observationsWithMissing: PanelObservation[] = [
        { entityId: 'A', time: 1, outcome: 10, predictors: { x: 1 } },
        { entityId: 'A', time: 2, outcome: 15, predictors: {} },
        { entityId: 'B', time: 1, outcome: 12, predictors: { x: 2 } },
        { entityId: 'B', time: 2, outcome: 18, predictors: { x: 3 } }
      ];

      const panel = new FEPanel(observationsWithMissing);
      const result = panel.estimate('outcome', ['x']);
      expect(result.convergence).toBe(true);
    });
  });
});