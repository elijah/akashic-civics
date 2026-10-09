import { DisparityVisualizer, VizConfig, VizSpec } from '../disparity_visualizer';

describe('DisparityVisualizer', () => {
  const viz = new DisparityVisualizer();

  it('should initialize properly', () => {
    expect(viz).toBeDefined();
    expect(viz).toBeInstanceOf(DisparityVisualizer);
  });

  it('should generate bar chart specification for conviction rates', () => {
    const config: VizConfig = {
      type: 'bar',
      title: 'Test Bar Chart',
      data: [],
      config: {
        primary_group: 'Black',
        reference_group: 'White',
        group_var: 'race_ethnicity',
        metric: 'conviction_rate',
        time_var: undefined,
        min_cases: 30,
      },
    };

    const spec: VizSpec = viz.barChartConvictionRates(config);
    
    expect(spec).toBeDefined();
    expect(spec.chart_type).toBe('bar');
    expect(spec.chart_title).toBe('Test Bar Chart');
    expect(spec.x_axis.label).toBe('race ethnicity');
    expect(spec.x_axis.field).toBe('race_ethnicity');
    expect(spec.y_axis.label).toBe('conviction rate (%)');
    expect(spec.color_variable).toBe('race_ethnicity');
    expect(spec.description).toContain('Compare conviction rate');
    expect(Array.isArray(spec.limitations)).toBe(true);
    expect(spec.limitations.length).toBeGreaterThan(0);
    expect(Array.isArray(spec.audience_notes)).toBe(true);
    expect(spec.audience_notes.length).toBeGreaterThan(0);
  });

  it('should generate trend line specification for disparity over time', () => {
    const config: VizConfig = {
      type: 'trend',
      title: 'Test Trend Line',
      data: [],
      config: {
        primary_group: 'Black',
        reference_group: 'White',
        group_var: 'race_ethnicity',
        metric: 'conviction_rate',
        time_var: 'year',
        min_cases: 30,
      },
    };

    const spec: VizSpec = viz.trendLineDisparity(config);
    
    expect(spec).toBeDefined();
    expect(spec.chart_type).toBe('line');
    expect(spec.chart_title).toBe('Test Trend Line');
    expect(spec.x_axis.label).toBe('Time Period');
    expect(spec.x_axis.field).toBe('year');
    expect(spec.y_axis.label).toBe('Disparity (percentage points gap)');
    expect(spec.color_variable).toBe('group');
    expect(spec.description).toContain('Tracking how the disparity');
    expect(Array.isArray(spec.limitations)).toBe(true);
    expect(Array.isArray(spec.audience_notes)).toBe(true);
  });

  it('should generate heatmap specification for offense type vs race gap', () => {
    const config: VizConfig = {
      type: 'heatmap',
      title: 'Test Heatmap',
      data: [],
      config: {
        primary_group: 'Black',
        reference_group: 'White',
        group_var: 'race_ethnicity',
        metric: 'conviction_rate',
        time_var: undefined,
        min_cases: 30,
      },
    };

    const spec: VizSpec = viz.heatmapDisparity(config);
    
    expect(spec).toBeDefined();
    expect(spec.chart_type).toBe('heatmap');
    expect(spec.chart_title).toBe('Test Heatmap');
    expect(spec.x_axis.label).toBe('Offense Type');
    expect(spec.x_axis.field).toBe('charge_type');
    expect(spec.y_axis.label).toBe('Demographic Group');
    expect(spec.y_axis.field).toBe('race_ethnicity');
    expect(spec.color_variable).toBe('disparity_rate');
    expect(spec.description).toContain('heatmap showing how disparities');
    expect(Array.isArray(spec.limitations)).toBe(true);
    expect(Array.isArray(spec.audience_notes)).toBe(true);
  });

  it('should generate judge comparison specification', () => {
    const config: VizConfig = {
      type: 'judge',
      title: 'Test Judge Chart',
      data: [],
      config: {
        primary_group: 'Black',
        reference_group: 'White',
        group_var: 'race_ethnicity',
        metric: 'conviction_rate',
        time_var: undefined,
        min_cases: 30,
      },
    };

    const spec: VizSpec = viz.judgeComparison(config);
    
    expect(spec).toBeDefined();
    expect(spec.chart_type).toBe('bar');
    expect(spec.chart_title).toBe('Test Judge Chart');
    expect(spec.x_axis.label).toBe('Judge Name');
    expect(spec.x_axis.field).toBe('judge_name');
    expect(spec.y_axis.label).toBe('Conviction Rate Gap (percentage points)');
    expect(spec.color_variable).toBe('jurisdiction');
    expect(spec.description).toContain('cases handled by a specific judge');
    expect(Array.isArray(spec.limitations)).toBe(true);
    expect(Array.isArray(spec.audience_notes)).toBe(true);
  });

  it('should generate sentence distribution specification', () => {
    const config: VizConfig = {
      type: 'sentence',
      title: 'Test Sentence Chart',
      data: [],
      config: {
        primary_group: 'Black',
        reference_group: 'White',
        group_var: 'race_ethnicity',
        metric: 'sentence_months',
        time_var: undefined,
        min_cases: 30,
      },
    };

    const spec: VizSpec = viz.sentenceDistribution(config);
    
    expect(spec).toBeDefined();
    expect(spec.chart_type).toBe('histogram');
    expect(spec.chart_title).toBe('Test Sentence Chart');
    expect(spec.x_axis.label).toBe('Sentence Length (months)');
    expect(spec.x_axis.field).toBe('sentence_months');
    expect(spec.y_axis.label).toBe('Number of Cases');
    expect(spec.color_variable).toBe('race_ethnicity');
    expect(spec.description).toContain('Overlaid histograms showing the distribution');
    expect(Array.isArray(spec.limitations)).toBe(true);
    expect(Array.isArray(spec.audience_notes)).toBe(true);
  });

  it('should generate disposition flow specification', () => {
    const config: VizConfig = {
      type: 'disposition',
      title: 'Test Disposition Chart',
      data: [],
      config: {
        primary_group: 'Black',
        reference_group: 'White',
        group_var: 'race_ethnicity',
        metric: 'disposition_type',
        time_var: undefined,
        min_cases: 30,
      },
    };

    const spec: VizSpec = viz.dispositionFlow(config);
    
    expect(spec).toBeDefined();
    expect(spec.chart_type).toBe('stacked');
    expect(spec.chart_title).toBe('Test Disposition Chart');
    expect(spec.x_axis.label).toBe('Demographic Group');
    expect(spec.x_axis.field).toBe('race_ethnicity');
    expect(spec.y_axis.label).toBe('Proportion of Cases (%)');
    expect(spec.color_variable).toBe('disposition_type');
    expect(spec.description).toContain('stacked bar chart showing how cases flow');
    expect(Array.isArray(spec.limitations)).toBe(true);
    expect(Array.isArray(spec.audience_notes)).toBe(true);
  });

  it('should handle all visualization types', () => {
    const vizTypes = ['bar', 'trend', 'heatmap', 'judge', 'sentence', 'disposition'] as const;
    
    for (const type of vizTypes) {
      const config: VizConfig = {
        type,
        title: `Test ${type} Chart`,
        data: [],
        config: {
          primary_group: 'Black',
          reference_group: 'White',
          group_var: 'race_ethnicity',
          metric: 'conviction_rate',
          time_var: undefined,
          min_cases: 30,
        },
      };

      if (type === 'bar') {
        const spec = viz.barChartConvictionRates(config);
        expect(spec.chart_type).toBe('bar');
      } else if (type === 'trend') {
        const spec = viz.trendLineDisparity(config);
        expect(spec.chart_type).toBe('line');
      } else if (type === 'heatmap') {
        const spec = viz.heatmapDisparity(config);
        expect(spec.chart_type).toBe('heatmap');
      } else if (type === 'judge') {
        const spec = viz.judgeComparison(config);
        expect(spec.chart_type).toBe('bar');
      } else if (type === 'sentence') {
        const spec = viz.sentenceDistribution(config);
        expect(spec.chart_type).toBe('histogram');
      } else if (type === 'disposition') {
        const spec = viz.dispositionFlow(config);
        expect(spec.chart_type).toBe('stacked');
      }
    }
  });
});