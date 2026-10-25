/**
 * Interactive Visualization Specifications
 * Generates D3.js-compatible chart specifications with accessibility,
 * colorblind-safe palettes, zoom/pan, tooltips, and filters.
 * These specs are consumed by a D3.js frontend renderer.
 */

import { VizConfig } from './disparity_visualizer';

/* ============================================================================
 * Color Palettes (colorblind-safe, WCAG 2.1 AA compliant contrast)
 * ============================================================================ */

/** Colorblind-safe categorical palettes (ColorBrewer / Okabe-Ito derived). */
export const COLORBLIND_PALETTES: Record<string, string[]> = {
  okabe_ito: [
    '#E69F00', // orange
    '#56B4E9', // sky blue
    '#009E73', // bluish green
    '#F0E442', // yellow
    '#0072B2', // blue
    '#D55E00', // vermillion
    '#CC79A7', // reddish purple
    '#999999', // gray
  ],
  tableau_10: [
    '#4E79A7', // blue
    '#F28E2B', // orange
    '#E15759', // red
    '#76B7B2', // teal
    '#59A14F', // green
    '#EDC949', // yellow
    '#B07AA1', // purple
    '#FF9DA7', // pink
    '#9C755F', // brown
    '#BAB0AC', // gray
  ],
  muted: [
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
    '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
  ],
};

export interface PaletteConfig {
  name: 'okabe_ito' | 'tableau_10' | 'muted';
  maxCategories: number;
}

export function getColorblindPalette(
  name: keyof typeof COLORBLIND_PALETTES = 'okabe_ito',
  categoryCount?: number
): string[] {
  const palette = COLORBLIND_PALETTES[name];
  if (categoryCount === undefined) {
    return [...palette];
  }
  if (categoryCount <= palette.length) {
    return palette.slice(0, categoryCount);
  }
  // Cycle the palette if we need more colors than available
  const result: string[] = [];
  for (let i = 0; i < categoryCount; i++) {
    result.push(palette[i % palette.length]);
  }
  return result;
}

/* ============================================================================
 * Types
 * ============================================================================ */

export interface TooltipConfig {
  enabled: boolean;
  format: string; // d3-format style, e.g. ".2%" or ".3f"
  fields: string[]; // data fields to show in tooltip
  html?: boolean;
}

export interface ZoomPanConfig {
  enabled: boolean;
  scaleExtent: [number, number]; // [min, max] zoom scale
  duration: number; // transition duration in ms
}

export interface FilterConfig {
  enabled: boolean;
  fields: string[]; // fields available for filtering
  defaultValue?: any;
}

export interface AccessibilityConfig {
  wcagLevel: 'A' | 'AA' | 'AAA';
  ariaLabel: string;
  ariaDescribedBy?: string;
  screenReaderSummary: string;
  longdesc?: string;
  colorContrastRatio?: number;
  keyboardNavigable: boolean;
  focusable: boolean;
  role?: string;
}

export interface D3ChartSpec {
  chart_type: string;
  chart_title: string;
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  x_axis: { label: string; field: string; type: 'linear' | 'band' | 'time'; domain?: [any, any] };
  y_axis: { label: string; field: string; type: 'linear' | 'band' | 'time'; domain?: [any, any] };
  color_variable: string;
  color_palette: string[];
  description: string;
  limitations: string[];
  audience_notes: string[];
  tooltip: TooltipConfig;
  zoom_pan: ZoomPanConfig;
  filters: FilterConfig;
  accessibility: AccessibilityConfig;
  data_transform?: string; // e.g. 'aggregate', 'bin', 'stack'
  animation?: { enabled: boolean; duration: number };
}

/* ============================================================================
 * Interactive Visualizer
 * ============================================================================ */

export class InteractiveVisualizer {
  private defaultTooltip(): TooltipConfig {
    return {
      enabled: true,
      format: '.3f',
      fields: [],
      html: false,
    };
  }

  private defaultZoomPan(): ZoomPanConfig {
    return {
      enabled: true,
      scaleExtent: [0.5, 4],
      duration: 750,
    };
  }

  private defaultFilters(fields: string[]): FilterConfig {
    return {
      enabled: fields.length > 0,
      fields,
    };
  }

  private defaultAccessibility(
    title: string,
    summary: string,
    wcagLevel: 'A' | 'AA' | 'AAA' = 'AA'
  ): AccessibilityConfig {
    return {
      wcagLevel,
      ariaLabel: title,
      screenReaderSummary: summary,
      keyboardNavigable: true,
      focusable: true,
      role: 'img',
      colorContrastRatio: wcagLevel === 'AAA' ? 7 : wcagLevel === 'AA' ? 4.5 : 3,
    };
  }

  private baseSpec(
    type: string,
    title: string,
    xField: string,
    yField: string,
    colorVar: string,
    paletteName: keyof typeof COLORBLIND_PALETTES = 'okabe_ito',
    categoryCount: number = 8
  ): Omit<D3ChartSpec, 'tooltip' | 'zoom_pan' | 'filters' | 'accessibility'> {
    return {
      chart_type: type,
      chart_title: title,
      width: 800,
      height: 500,
      margin: { top: 60, right: 60, bottom: 70, left: 80 },
      x_axis: {
        label: xField.replace(/_/g, ' '),
        field: xField,
        type: type === 'time' ? 'time' : 'band',
      },
      y_axis: {
        label: yField.replace(/_/g, ' '),
        field: yField,
        type: 'linear',
      },
      color_variable: colorVar,
      color_palette: getColorblindPalette(paletteName, categoryCount),
      description: '',
      limitations: [],
      audience_notes: [],
      data_transform: undefined,
      animation: { enabled: true, duration: 750 },
    };
  }

  /* ------------------------------------------------------------------ *
   * Bar chart (D3 spec)
   * ------------------------------------------------------------------ */
  barChart(config: VizConfig): D3ChartSpec {
    const groupVar = config.config.group_var || 'race_ethnicity';
    const metric = config.config.metric || 'conviction_rate';
    const base = this.baseSpec(
      'bar',
      config.title || 'Interactive Bar Chart',
      groupVar,
      metric,
      groupVar,
      'okabe_ito',
      8
    );
    return {
      ...base,
      description: `Compare ${metric.replace(/_/g, ' ')} across ${groupVar.replace(/_/g, ' ')} groups. Bars are sortable and filterable.`,
      limitations: [
        'Bars may not show statistical significance - check confidence intervals',
        'Small sample sizes may make rates unreliable',
        'Rates may be affected by case mix differences (controls needed)',
      ],
      audience_notes: [
        'Large gaps between bars indicate potential disparate treatment',
        'Hover over bars for exact values',
        'Click bars to filter the dashboard',
      ],
      tooltip: { ...this.defaultTooltip(), fields: [groupVar, metric], format: '.3f' },
      zoom_pan: { ...this.defaultZoomPan(), enabled: false },
      filters: this.defaultFilters([groupVar, metric]),
      accessibility: this.defaultAccessibility(
        base.chart_title,
        `Bar chart comparing ${metric} across ${groupVar} groups. Use arrow keys to navigate bars, Enter to select.`
      ),
    };
  }

  /* ------------------------------------------------------------------ *
   * Line / trend chart (D3 spec) with zoom/pan
   * ------------------------------------------------------------------ */
  lineChart(config: VizConfig): D3ChartSpec {
    const timeVar = config.config.time_var || 'year';
    const groupVar = config.config.group_var || 'race_ethnicity';
    const metric = config.config.metric || 'gap';
    const base = this.baseSpec(
      'line',
      config.title || 'Interactive Trend Line',
      timeVar,
      metric,
      groupVar,
      'tableau_10',
      10
    );
    base.x_axis.type = 'time';
    return {
      ...base,
      description: `Track ${metric.replace(/_/g, ' ')} over ${timeVar.replace(/_/g, ' ')}. Zoom and pan to inspect periods of interest.`,
      limitations: [
        'Year-to-year fluctuations may be due to small sample sizes',
        'Requires at least 3-5 years of data for meaningful trends',
        'Policy changes or external events may affect trajectories',
      ],
      audience_notes: [
        'A rising line = disparity getting worse',
        'A flat line = status quo maintained',
        'Scroll/zoom to inspect specific time periods',
      ],
      tooltip: { ...this.defaultTooltip(), fields: [timeVar, metric, groupVar], format: '.2f' },
      zoom_pan: { ...this.defaultZoomPan(), enabled: true },
      filters: this.defaultFilters([groupVar, timeVar]),
      accessibility: this.defaultAccessibility(
        base.chart_title,
        `Line chart tracking ${metric} over ${timeVar}. Use zoom and pan controls to explore. Arrow keys navigate data points.`
      ),
    };
  }

  /* ------------------------------------------------------------------ *
   * Heatmap (D3 spec) with filters
   * ------------------------------------------------------------------ */
  heatmapChart(config: VizConfig): D3ChartSpec {
    const groupVar = config.config.group_var || 'race_ethnicity';
    const base = this.baseSpec(
      'heatmap',
      config.title || 'Interactive Heatmap',
      'charge_type',
      groupVar,
      'disparity_rate',
      'okabe_ito',
      8
    );
    base.x_axis.type = 'band';
    base.y_axis.type = 'band';
    return {
      ...base,
      description: `Heatmap of disparity rates across offense types and ${groupVar.replace(/_/g, ' ')} groups. Darker cells indicate larger disparities.`,
      limitations: [
        'Cells with small sample sizes should be interpreted cautiously',
        'Color scale may be affected by extreme values',
        'Requires large sample sizes for reliable cell-level estimates',
      ],
      audience_notes: [
        'Look for clusters of dark cells - areas of high concern',
        'Hover over cells for exact rates and sample sizes',
        'Filter by offense type or group to focus the view',
      ],
      tooltip: {
        ...this.defaultTooltip(),
        fields: ['charge_type', groupVar, 'disparity_rate', 'sample_size'],
        format: '.2f',
      },
      zoom_pan: { ...this.defaultZoomPan(), enabled: false },
      filters: this.defaultFilters(['charge_type', groupVar]),
      accessibility: this.defaultAccessibility(
        base.chart_title,
        `Heatmap showing disparity rates across offense types and ${groupVar} groups. Navigate cells with arrow keys; dark colors indicate larger disparities.`
      ),
    };
  }

  /* ------------------------------------------------------------------ *
   * Scatter plot (D3 spec) with zoom/pan + tooltip
   * ------------------------------------------------------------------ */
  scatterPlot(config: VizConfig, xField: string = 'x', yField: string = 'y'): D3ChartSpec {
    const groupVar = config.config.group_var || 'race_ethnicity';
    const base = this.baseSpec(
      'scatter',
      config.title || 'Interactive Scatter Plot',
      xField,
      yField,
      groupVar,
      'tableau_10',
      10
    );
    base.x_axis.type = 'linear';
    base.y_axis.type = 'linear';
    return {
      ...base,
      description: `Scatter plot of ${yField.replace(/_/g, ' ')} vs ${xField.replace(/_/g, ' ')} colored by ${groupVar.replace(/_/g, ' ')}.`,
      limitations: [
        'Correlation does not imply causation',
        'Outliers may distort visual patterns',
        'Overplotting can obscure dense regions',
      ],
      audience_notes: [
        'Clusters indicate groups with similar values',
        'Hover over points for exact values',
        'Zoom to inspect dense regions',
      ],
      tooltip: { ...this.defaultTooltip(), fields: [xField, yField, groupVar], format: '.3f' },
      zoom_pan: { ...this.defaultZoomPan(), enabled: true },
      filters: this.defaultFilters([groupVar]),
      accessibility: this.defaultAccessibility(
        base.chart_title,
        `Scatter plot of ${yField} vs ${xField}, colored by ${groupVar}. Arrow keys navigate points; zoom to explore.`
      ),
    };
  }

  /* ------------------------------------------------------------------ *
   * Box plot (D3 spec)
   * ------------------------------------------------------------------ */
  boxPlot(config: VizConfig, groupVar: string = 'race_ethnicity', metric: string = 'sentence_months'): D3ChartSpec {
    const base = this.baseSpec(
      'boxplot',
      config.title || 'Box Plot',
      groupVar,
      metric,
      groupVar,
      'okabe_ito',
      8
    );
    base.x_axis.type = 'band';
    return {
      ...base,
      description: `Box plot of ${metric.replace(/_/g, ' ')} distribution by ${groupVar.replace(/_/g, ' ')}. Shows median, quartiles, and outliers.`,
      limitations: [
        'Only includes cases with recorded values for the metric',
        'Small groups produce unreliable quartile estimates',
        'Outliers may reflect data quality issues rather than true extremes',
      ],
      audience_notes: [
        'Wider boxes = more variable outcomes within a group',
        'Non-overlapping boxes suggest meaningful differences',
        'Hover for quartile values and outlier counts',
      ],
      tooltip: { ...this.defaultTooltip(), fields: [groupVar, metric], format: '.2f' },
      zoom_pan: { ...this.defaultZoomPan(), enabled: false },
      filters: this.defaultFilters([groupVar]),
      accessibility: this.defaultAccessibility(
        base.chart_title,
        `Box plot of ${metric} by ${groupVar}. Navigate groups with arrow keys; boxes summarize distribution spread.`
      ),
    };
  }

  /* ------------------------------------------------------------------ *
   * Palette helper
   * ------------------------------------------------------------------ */
  getPalette(name: keyof typeof COLORBLIND_PALETTES, count?: number): string[] {
    return getColorblindPalette(name, count);
  }

  /* ------------------------------------------------------------------ *
   * Validate WCAG contrast ratio for a foreground/background pair
   * ------------------------------------------------------------------ */
  contrastRatio(foreground: string, background: string): number {
    const getLuminance = (hex: string): number => {
      const c = hex.replace('#', '');
      const rgb = c.length === 3
        ? c.split('').map((ch) => parseInt(ch + ch, 16))
        : [c.slice(0, 2), c.slice(2, 4), c.slice(4, 6)].map((s) => parseInt(s, 16));
      const srgb = rgb.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    };
    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const light = Math.max(l1, l2);
    const dark = Math.min(l1, l2);
    return (light + 0.05) / (dark + 0.05);
  }

  /* ------------------------------------------------------------------ *
   * Check a color pair against a WCAG level
   * ------------------------------------------------------------------ */
  meetsWCAG(foreground: string, background: string, level: 'A' | 'AA' | 'AAA' = 'AA'): boolean {
    const ratio = this.contrastRatio(foreground, background);
    const required = level === 'AAA' ? 7 : level === 'AA' ? 4.5 : 3;
    return ratio >= required;
  }
}

/* ============================================================================
 * Convenience: build a full D3 spec from a VizConfig + chart type
 * ============================================================================ */

export interface InteractiveVizOptions {
  chartType: 'bar' | 'line' | 'heatmap' | 'scatter' | 'boxplot';
  palette?: keyof typeof COLORBLIND_PALETTES;
  wcagLevel?: 'A' | 'AA' | 'AAA';
  enableZoomPan?: boolean;
  enableTooltips?: boolean;
}

export function buildInteractiveSpec(
  config: VizConfig,
  options: InteractiveVizOptions
): D3ChartSpec {
  const viz = new InteractiveVisualizer();

  const base = (() => {
    switch (options.chartType) {
      case 'line':
        return viz.lineChart(config);
      case 'heatmap':
        return viz.heatmapChart(config);
      case 'scatter':
        return viz.scatterPlot(config);
      case 'boxplot':
        return viz.boxPlot(config);
      default:
        return viz.barChart(config);
    }
  })();

  // Apply palette override
  if (options.palette) {
    // Use the requested palette in full rather than truncating it to the
    // length of the palette the chart type defaults to.
    base.color_palette = viz.getPalette(options.palette);
  }

  // Apply WCAG level
  base.accessibility.wcagLevel = options.wcagLevel ?? 'AA';
  base.accessibility.colorContrastRatio =
    options.wcagLevel === 'AAA' ? 7 : options.wcagLevel === 'AA' ? 4.5 : 3;

  // Toggle zoom/pan
  if (options.enableZoomPan !== undefined) {
    base.zoom_pan.enabled = options.enableZoomPan;
  }

  // Toggle tooltips
  if (options.enableTooltips !== undefined) {
    base.tooltip.enabled = options.enableTooltips;
  }

  return base;
}
