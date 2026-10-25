import {
  InteractiveVisualizer,
  InteractiveVizOptions,
  COLORBLIND_PALETTES,
  getColorblindPalette,
  buildInteractiveSpec,
  D3ChartSpec,
} from '../interactive_visualizer';
import { DashboardBuilder, buildDashboard, TextWidget, KPIWidget, TableWidget, DividerWidget } from '../dashboard_builder';
import { VizConfig } from '../disparity_visualizer';

const createBaseVizConfig = (): VizConfig => ({
  title: 'Test Chart',
  data: [],
  type: 'bar',
  config: {
    primary_group: 'Black',
    reference_group: 'White',
    group_var: 'race_ethnicity',
    metric: 'conviction_rate',
  },
});

const createD3ChartSpec = (): D3ChartSpec => ({
  chart_type: 'bar',
  chart_title: 'Test Chart',
  width: 800,
  height: 500,
  margin: { top: 60, right: 60, bottom: 70, left: 80 },
  x_axis: { label: 'Group', field: 'race_ethnicity', type: 'band' },
  y_axis: { label: 'Rate (%)', field: 'conviction_rate', type: 'linear' },
  color_variable: 'race_ethnicity',
  color_palette: COLORBLIND_PALETTES.okabe_ito,
  description: 'Test chart',
  limitations: [],
  audience_notes: [],
  tooltip: { enabled: true, format: '.3f', fields: [], html: false },
  zoom_pan: { enabled: true, scaleExtent: [0.5, 4], duration: 750 },
  filters: { enabled: true, fields: [] },
  accessibility: {
    wcagLevel: 'AA',
    ariaLabel: 'Test Chart',
    screenReaderSummary: 'Test chart',
    keyboardNavigable: true,
    focusable: true,
    role: 'img',
    colorContrastRatio: 4.5,
  },
});

describe('InteractiveVisualizer', () => {
  let viz: InteractiveVisualizer;

  beforeEach(() => {
    viz = new InteractiveVisualizer();
  });

  describe('colors and palettes', () => {
    it('should provide okabe_ito palette', () => {
      expect(COLORBLIND_PALETTES.okabe_ito).toBeDefined();
      expect(COLORBLIND_PALETTES.okabe_ito.length).toBe(8);
    });

    it('should provide tableau_10 palette', () => {
      expect(Array.isArray(COLORBLIND_PALETTES.tableau_10)).toBe(true);
      expect(COLORBLIND_PALETTES.tableau_10.length).toBe(10);
    });

    it('getColorblindPalette returns correct colors', () => {
      expect(getColorblindPalette()).toEqual(COLORBLIND_PALETTES.okabe_ito);
      expect(getColorblindPalette('tableau_10')).toEqual(COLORBLIND_PALETTES.tableau_10);
    });

    it('getColorblindPalette handles count > palette size', () => {
      const palette = getColorblindPalette('okabe_ito', 12);
      expect(palette.length).toBe(12);
    });
  });

  describe('contrast ratio', () => {
    it('should return 21 for black on white', () => {
      expect(viz.contrastRatio('#000000', '#ffffff')).toBe(21);
    });

    it('should return false for low contrast', () => {
      expect(viz.meetsWCAG('#888888', '#cccccc', 'AA')).toBe(false);
    });

    it('should return true for high contrast pairs', () => {
      expect(viz.meetsWCAG('#000000', '#ffffff', 'AA')).toBe(true);
      expect(viz.meetsWCAG('#000000', '#ffffff', 'AAA')).toBe(true);
    });
  });

  describe('chart specs', () => {
    it('should build a bar chart spec', () => {
      const config = createBaseVizConfig();
      const spec = viz.barChart(config);
      expect(spec.chart_type).toBe('bar');
      expect(spec.chart_title).toBe('Test Chart');
      expect(spec.color_palette).toBeDefined();
      expect(spec.tooltip.enabled).toBe(true);
      expect(spec.accessibility.wcagLevel).toBe('AA');
    });

    it('should build a line chart spec with time axis', () => {
      const config: VizConfig = {
        title: 'Trend Chart',
        data: [],
        type: 'trend',
        config: { primary_group: 'Black', reference_group: 'White', group_var: 'race_ethnicity', metric: 'gap', time_var: 'year' },
      };
      const spec = viz.lineChart(config);

      expect(spec.chart_type).toBe('line');
      expect(spec.x_axis.type).toBe('time');
      expect(spec.zoom_pan.enabled).toBe(true);
    });

    it('should build a heatmap spec', () => {
      const config = createBaseVizConfig();
      const spec = viz.heatmapChart(config);

      expect(spec.chart_type).toBe('heatmap');
      expect(spec.x_axis.type).toBe('band');
      expect(spec.y_axis.type).toBe('band');
    });

    it('should build a scatter plot spec', () => {
      const config = createBaseVizConfig();
      const spec = viz.scatterPlot(config);

      expect(spec.chart_type).toBe('scatter');
      expect(spec.x_axis.type).toBe('linear');
      expect(spec.y_axis.type).toBe('linear');
    });

    it('should build a box plot spec', () => {
      const config = createBaseVizConfig();
      const spec = viz.boxPlot(config);

      expect(spec.chart_type).toBe('boxplot');
    });
  });

  describe('buildInteractiveSpec helper', () => {
    it('should build spec with custom options', () => {
      const config = createBaseVizConfig();
      const options: InteractiveVizOptions = {
        chartType: 'bar',
        palette: 'tableau_10',
        wcagLevel: 'AAA',
        enableZoomPan: false,
        enableTooltips: true,
      };

      const spec = buildInteractiveSpec(config, options);
      expect(spec.color_palette).toEqual(COLORBLIND_PALETTES.tableau_10);
      expect(spec.accessibility.wcagLevel).toBe('AAA');
      expect(spec.zoom_pan.enabled).toBe(false);
      expect(spec.tooltip.enabled).toBe(true);
    });
  });
});

describe('DashboardBuilder', () => {
  let builder: DashboardBuilder;

  beforeEach(() => {
    builder = new DashboardBuilder({ title: 'Test Dashboard', description: 'A test dashboard' });
  });

  describe('chart widget', () => {
    it('should add chart widget', () => {
      builder.addChart(createD3ChartSpec(), { x: 0, y: 0, w: 6, h: 15 });

      const spec = builder.build();
      expect(spec.widgets.length).toBe(1);
      expect(spec.widgets[0].type).toBe('chart');
      expect(spec.widgets[0].visible).toBe(true);
    });
  });

  describe('filter widget', () => {
    it('should add filter widget', () => {
      builder.addFilter('race', 'select', [{ value: 'Black', label: 'Black' }], ['chart1'], 'Black', { x: 0, y: 0, w: 4, h: 3 });

      const spec = builder.build();
      expect(spec.widgets[0].type).toBe('filter');
      expect(spec.filters[0].field).toBe('race');
      expect(spec.filters[0].targets).toEqual(['chart1']);
    });

    it('should add global filter', () => {
      builder.addGlobalFilter('year', 'select', [{ value: 2020, label: '2020' }], 2020, { x: 0, y: 0, w: 4, h: 3 });

      const spec = builder.build();
      expect(spec.filters[0].type).toBe('global');
      expect(spec.filters[0].targets).toEqual(['*']);
    });
  });

  describe('other widgets', () => {
    it('should add text widget', () => {
      builder.addText('Hello World', { x: 0, y: 0, w: 12, h: 15 }, 'markdown');

      const spec = builder.build();
      expect(spec.widgets[0].type).toBe('text');
      expect((spec.widgets[0] as TextWidget).content).toBe('Hello World');
    });

    it('should add KPI widget', () => {
      builder.addKPI(0.42, '.2f', { x: 0, y: 0, w: 4, h: 15 });

      const spec = builder.build();
      expect(spec.widgets[0].type).toBe('kpi');
      expect(String((spec.widgets[0] as KPIWidget).value)).toBe('0.42');
    });

    it('should add table widget', () => {
      builder.addTable([{ field: 'year', header: 'Year' }], [{ year: 2020 }], { x: 0, y: 0, w: 12, h: 15 });

      const spec = builder.build();
      expect(spec.widgets[0].type).toBe('table');
      expect((spec.widgets[0] as TableWidget).columns.length).toBe(1);
      expect((spec.widgets[0] as TableWidget).data.length).toBe(1);
    });

    it('should add divider', () => {
      builder.addDivider('horizontal', { x: 0, y: 0, w: 12, h: 1 });

      const spec = builder.build();
      expect(spec.widgets[0].type).toBe('divider');
      expect((spec.widgets[0] as DividerWidget).orientation).toBe('horizontal');
    });
  });

  describe('layout', () => {
    it('should auto-layout widgets', () => {
      builder.addText('First', { x: 0, y: 0, w: 6, h: 5 });
      builder.addText('Second', { x: 0, y: 0, w: 6, h: 5 });

      builder.autoLayout(2);

      const spec = builder.build();
      expect(spec.widgets.length).toBe(2);
    });

    it('should set widget position', () => {
      builder.addChart(createD3ChartSpec(), { x: 0, y: 0, w: 6, h: 15 });
      const id = builder.build().widgets[0].id;

      builder.setWidgetPosition(id, { x: 3, y: 10, w: 4, h: 8 });

      const spec = builder.build();
      expect(spec.widgets[0].position.x).toBe(3);
      expect(spec.widgets[0].position.y).toBe(10);
      expect(spec.widgets[0].position.w).toBe(4);
    });

    it('should remove widget', () => {
      builder.addChart(createD3ChartSpec(), { x: 0, y: 0, w: 6, h: 15 });
      const id = builder.build().widgets[0].id;

      builder.removeWidget(id);

      const spec = builder.build();
      expect(spec.widgets.length).toBe(0);
    });

    it('should toggle widget visibility', () => {
      builder.addText('Test', { x: 0, y: 0, w: 12, h: 5 });
      const id = builder.build().widgets[0].id;

      builder.toggleWidget(id, false);

      const spec = builder.build();
      expect(spec.widgets[0].visible).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should set title and description', () => {
      builder.setTitle('Custom Title');
      builder.setDescription('Custom Description');

      const spec = builder.build();
      expect(spec.config.title).toBe('Custom Title');
      expect(spec.config.description).toBe('Custom Description');
    });

    it('should set theme', () => {
      builder.setTheme({ accentColor: '#FF0000', fontFamily: 'monospace' });

      const spec = builder.build();
      expect(spec.config.theme.accentColor).toBe('#FF0000');
      expect(spec.config.theme.fontFamily).toBe('monospace');
    });

    it('should set accessibility', () => {
      builder.setAccessibility({ wcagLevel: 'AAA' });

      const spec = builder.build();
      expect(spec.config.accessibility.wcagLevel).toBe('AAA');
    });
  });

  describe('exports', () => {
    it('should exportHTML', () => {
      builder.addText('Content', { x: 0, y: 0, w: 12, h: 5 });

      const html = builder.exportHTML({ includeD3: false, embedCSS: true });
      expect(html).toContain('ak-dashboard');
      expect(html).toContain('Test Dashboard');
    });

    it('should exportMarkdown', () => {
      builder.addText('Markdown content', { x: 0, y: 0, w: 12, h: 5 });

      const md = builder.exportMarkdown();
      expect(md).toContain('Test Dashboard');
      expect(md).toContain('Markdown content');
    });

    it('should exportJSON', () => {
      builder.addText('Content', { x: 0, y: 0, w: 12, h: 5 });

      const json = builder.exportJSON();
      const parsed = JSON.parse(json);
      expect(parsed.config.title).toBe('Test Dashboard');
      expect(parsed.widgets).toHaveLength(1);
    });
  });

  describe('buildDashboard helper', () => {
    it('should build dashboard from options', () => {
      const db = buildDashboard({
        title: 'Helper Dashboard',
        description: 'Built via helper function',
        charts: [
          { spec: createD3ChartSpec(), position: { x: 0, y: 0, w: 6, h: 15 } },
        ],
        theme: { accentColor: '#00FF00' },
      });

      expect(db.spec.config.title).toBe('Helper Dashboard');
      expect(db.spec.config.theme.accentColor).toBe('#00FF00');
      expect(db.spec.widgets.length).toBe(1);
    });

    it('should handle global filters', () => {
      const db = buildDashboard({
        title: 'Dashboard',
        description: 'Test',
        charts: [{ spec: createD3ChartSpec(), position: { x: 0, y: 0, w: 6, h: 15 } }],
        globalFilters: [{ field: 'year', type: 'select', options: [{ value: 2020, label: '2020' }], defaultValue: 2020 }],
      });

      expect(db.spec.filters.length).toBe(1);
      expect(db.spec.filters[0].field).toBe('year');
    });
  });
});