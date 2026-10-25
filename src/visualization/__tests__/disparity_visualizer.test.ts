import { DisparityVisualizer, VizConfig, VizSpec, generateEmbedCode } from '../disparity_visualizer';

const createBaseConfig = (type: 'bar' | 'trend' | 'heatmap' | 'judge' | 'sentence' | 'disposition' = 'bar', overrides: Record<string, any> = {}): VizConfig => ({
  type,
  title: 'Test Chart',
  data: [],
  config: {
    primary_group: 'Black',
    reference_group: 'White',
    group_var: 'race_ethnicity',
    metric: 'conviction_rate',
    ...overrides,
  },
});

describe('DisparityVisualizer', () => {
  let viz: DisparityVisualizer;

  beforeEach(() => {
    viz = new DisparityVisualizer();
  });

  it('should initialize properly', () => {
    expect(viz).toBeDefined();
    expect(viz).toBeInstanceOf(DisparityVisualizer);
  });

  it('should generate bar chart specification for conviction rates', () => {
    const config = createBaseConfig('bar');
    const spec = viz.barChartConvictionRates(config);

    expect(spec).toBeDefined();
    expect(spec.chart_type).toBe('bar');
    expect(spec.chart_title).toBe('Test Chart');
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

  it('should generate trend line specification for conviction rates', () => {
    const config = createBaseConfig('trend', { time_var: 'year' });
    const spec = viz.trendLineDisparity(config);

    expect(spec).toBeDefined();
    expect(spec.chart_type).toBe('line');
    expect(spec.chart_title).toBe('Test Chart');
    expect(spec.x_axis.label).toBe('Time Period');
    expect(spec.x_axis.field).toBe('year');
    expect(spec.y_axis.label).toBe('Disparity (percentage points gap)');
    expect(spec.color_variable).toBe('group');
    expect(spec.description).toContain('Tracking how the disparity');
    expect(Array.isArray(spec.limitations)).toBe(true);
    expect(Array.isArray(spec.audience_notes)).toBe(true);
  });

  it('should generate heatmap specification for offense type vs race gap', () => {
    const config = createBaseConfig('heatmap');
    const spec = viz.heatmapDisparity(config);

    expect(spec).toBeDefined();
    expect(spec.chart_type).toBe('heatmap');
    expect(spec.chart_title).toBe('Test Chart');
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
    const config = createBaseConfig('judge');
    const spec = viz.judgeComparison(config);

    expect(spec).toBeDefined();
    expect(spec.chart_type).toBe('bar');
    expect(spec.chart_title).toBe('Test Chart');
    expect(spec.x_axis.label).toBe('Judge Name');
    expect(spec.x_axis.field).toBe('judge_name');
    expect(spec.y_axis.label).toBe('Conviction Rate Gap (percentage points)');
    expect(spec.color_variable).toBe('jurisdiction');
    expect(spec.description).toContain('cases handled by a specific judge');
    expect(Array.isArray(spec.limitations)).toBe(true);
    expect(Array.isArray(spec.audience_notes)).toBe(true);
  });

  it('should generate sentence distribution specification', () => {
    const config = createBaseConfig('sentence', { group_var: 'race_ethnicity' });
    const spec = viz.sentenceDistribution(config);

    expect(spec).toBeDefined();
    expect(spec.chart_type).toBe('histogram');
    expect(spec.chart_title).toBe('Test Chart');
    expect(spec.x_axis.label).toBe('Sentence Length (months)');
    expect(spec.x_axis.field).toBe('sentence_months');
    expect(spec.y_axis.label).toBe('Number of Cases');
    expect(spec.color_variable).toBe('race_ethnicity');
    expect(spec.description).toContain('Overlaid histograms showing the distribution');
    expect(Array.isArray(spec.limitations)).toBe(true);
    expect(Array.isArray(spec.audience_notes)).toBe(true);
  });

  it('should generate disposition flow specification', () => {
    const config = createBaseConfig('disposition');
    const spec = viz.dispositionFlow(config);

    expect(spec).toBeDefined();
    expect(spec.chart_type).toBe('stacked');
    expect(spec.chart_title).toBe('Test Chart');
    expect(spec.x_axis.label).toBe('Demographic Group');
    expect(spec.x_axis.field).toBe('race_ethnicity');
    expect(spec.y_axis.label).toBe('Proportion of Cases (%)');
    expect(spec.color_variable).toBe('disposition_type');
    expect(spec.description).toContain('stacked bar chart showing how cases flow');
    expect(Array.isArray(spec.limitations)).toBe(true);
    expect(Array.isArray(spec.audience_notes)).toBe(true);
  });

  describe('autoSelectViz', () => {
    it('should auto-select trend chart with time_var and gap metric', () => {
      const config: VizConfig = {
        type: 'trend',
        title: 'Trend Chart',
        data: [{ year: 2020 }, { year: 2021 }],
        config: {
          primary_group: 'Black',
          reference_group: 'White',
          group_var: 'race_ethnicity',
          metric: 'gap',
          time_var: 'year',
        },
      };

      const spec = viz.autoSelectViz(config.data, config);
      expect(spec.chart_type).toBe('line');
      expect(spec.chart_title).toContain('Trend');
    });

    it('should auto-select judge comparison when judge_name is present', () => {
      const config: VizConfig = createBaseConfig('judge');
      config.config.group_var = 'judge_name';

      const data = [
        { judge_name: 'Judge A', race_ethnicity: 'Black' },
        { judge_name: 'Judge B', race_ethnicity: 'White' },
      ];

      const spec = viz.autoSelectViz(data, config);
      expect(spec.chart_type).toBe('bar');
      expect(spec.chart_title).toBe('Test Chart'); // Uses provided title
    });

    it('should auto-select sentence distribution for sentence_length metric', () => {
      const config: VizConfig = createBaseConfig('sentence');
      config.config.metric = 'sentence_length';

      const spec = viz.autoSelectViz([], config);
      expect(spec.chart_type).toBe('histogram');
      expect(spec.chart_title).toBe('Test Chart'); // Uses provided title
    });

    it('should auto-select disposition flow for disposition metric', () => {
      const config: VizConfig = createBaseConfig('disposition');
      config.config.metric = 'disposition';

      const spec = viz.autoSelectViz([], config);
      expect(spec.chart_type).toBe('stacked');
      expect(spec.chart_title).toBe('Test Chart'); // Uses provided title
    });

    it('should auto-select heatmap for large datasets with charge_type', () => {
      const data = Array.from({ length: 25 }, (_, i) => ({
        charge_type: `charge_${i}`,
        race_ethnicity: 'Black',
      }));

      const spec = viz.autoSelectViz(data, createBaseConfig());
      expect(spec.chart_type).toBe('heatmap');
      expect(spec.y_axis.field).toBe('race_ethnicity');
    });

    it('should default to bar chart when no other conditions match', () => {
      const config = createBaseConfig('bar');

      const spec = viz.autoSelectViz([], config);
      expect(spec.chart_type).toBe('bar');
      expect(spec.chart_title).toBe('Test Chart'); // Uses provided title
    });

    it('should use custom title if provided', () => {
      const config: VizConfig = createBaseConfig();
      config.title = 'Custom Title';

      const spec = viz.autoSelectViz([], config);
      expect(spec.chart_title).toBe('Custom Title');
    });

    it('should handle missing group_var with default', () => {
      const config: VizConfig = {
        type: 'bar',
        title: 'Test',
        data: [],
        config: {
          primary_group: 'Black',
          reference_group: 'White',
          group_var: undefined as any,
          metric: 'conviction_rate',
        },
      };

      const spec = viz.autoSelectViz([], config);
      expect(spec).toBeDefined();
    });

    it('should handle missing metric with default', () => {
      const config: VizConfig = {
        type: 'bar',
        title: 'Test',
        data: [],
        config: {
          primary_group: 'Black',
          reference_group: 'White',
          group_var: 'race_ethnicity',
          metric: undefined as any,
        },
      };

      const spec = viz.autoSelectViz([], config);
      expect(spec).toBeDefined();
    });
  });
});

describe('generateEmbedCode', () => {
  it('should generate HTML embed code with default dimensions', () => {
    const spec: VizSpec = {
      chart_type: 'bar',
      chart_title: 'Test Chart',
      x_axis: { label: 'Group', field: 'race_ethnicity' },
      y_axis: { label: 'Rate (%)', field: 'conviction_rate' },
      color_variable: 'race_ethnicity',
      description: 'Test description',
      limitations: [
        'Small sample sizes may make rates unreliable',
        'Bars may not show statistical significance',
      ],
      audience_notes: [
        'Large gaps between bars indicate potential disparate treatment',
        'Check if your group has the lowest rate',
      ],
    };

    const html = generateEmbedCode(spec);

    expect(html).toBeDefined();
    expect(html).toContain('<div class="akashic-viz"');
    expect(html).toContain('width: 100%');
    expect(html).toContain('height: 500px');
    expect(html).toContain('<h3>Test Chart</h3>');
    expect(html).toContain('Test description');
    expect(html).toContain('Limitations:');
    expect(html).toContain('Key Insights:');
  });

  it('should generate HTML embed code with custom dimensions', () => {
    const spec: VizSpec = {
      chart_type: 'line',
      chart_title: 'Trend Chart',
      x_axis: { label: 'Year', field: 'year' },
      y_axis: { label: 'Gap', field: 'gap' },
      color_variable: 'group',
      description: 'Trend description',
      limitations: ['Test limitation'],
      audience_notes: ['Test note'],
    };

    const html = generateEmbedCode(spec, '800px', '600px');

    expect(html).toContain('width: 800px');
    expect(html).toContain('height: 600px');
  });

  it('should include all limitations in embed code', () => {
    const spec: VizSpec = {
      chart_type: 'heatmap',
      chart_title: 'Heatmap',
      x_axis: { label: 'Offense', field: 'charge_type' },
      y_axis: { label: 'Group', field: 'race' },
      color_variable: 'disparity_rate',
      description: 'Heatmap description',
      limitations: ['Limitation 1', 'Limitation 2', 'Limitation 3'],
      audience_notes: ['Note'],
    };

    const html = generateEmbedCode(spec);

    expect(html).toContain('<li>Limitation 1</li>');
    expect(html).toContain('<li>Limitation 2</li>');
    expect(html).toContain('<li>Limitation 3</li>');
  });

  it('should include all audience notes in embed code', () => {
    const spec: VizSpec = {
      chart_type: 'bar',
      chart_title: 'Bar Chart',
      x_axis: { label: 'Group', field: 'race' },
      y_axis: { label: 'Rate', field: 'rate' },
      color_variable: 'race',
      description: 'Description',
      limitations: ['Limitation'],
      audience_notes: ['Note 1', 'Note 2'],
    };

    const html = generateEmbedCode(spec);

    expect(html).toContain('<li>Note 1</li>');
    expect(html).toContain('<li>Note 2</li>');
  });

  it('should return a trimmed string without leading/trailing whitespace', () => {
    const spec: VizSpec = {
      chart_type: 'bar',
      chart_title: 'Test',
      x_axis: { label: 'X', field: 'x' },
      y_axis: { label: 'Y', field: 'y' },
      color_variable: 'group',
      description: 'Description',
      limitations: [],
      audience_notes: [],
    };

    const html = generateEmbedCode(spec);
    expect(html.startsWith('\n')).toBe(false);
    expect(html.endsWith('\n')).toBe(false);
  });

  it('should include chart type in placeholder', () => {
    const spec: VizSpec = {
      chart_type: 'scatter',
      chart_title: 'Test',
      x_axis: { label: 'X', field: 'x' },
      y_axis: { label: 'Y', field: 'y' },
      color_variable: 'group',
      description: 'Desc',
      limitations: [],
      audience_notes: [],
    };

    const html = generateEmbedCode(spec);
    expect(html).toContain('Chart: scatter');
  });
});