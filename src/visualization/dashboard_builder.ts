/**
 * Dashboard Builder
 * Builds dashboards from multiple visualization specs with drag-and-drop layout,
 * filter widgets, and export to HTML/PDF/PPT.
 */

import { VizSpec } from './disparity_visualizer';
import { D3ChartSpec } from './interactive_visualizer';

/* ============================================================================
 * Types
 * ============================================================================ */

export type WidgetType =
  | 'chart'
  | 'filter'
  | 'text'
  | 'table'
  | 'kpi'
  | 'divider';

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BaseWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  visible: boolean;
  accessibility: {
    ariaLabel: string;
    tabIndex: number;
  };
}

export interface ChartWidget extends BaseWidget {
  type: 'chart';
  chartSpec: D3ChartSpec | VizSpec;
}

export interface FilterWidget extends BaseWidget {
  type: 'filter';
  filterField: string;
  filterType: 'select' | 'multiSelect' | 'dateRange' | 'slider';
  options: Array<{ value: any; label: string }>;
  defaultValue: any;
  targets: string[]; // widget IDs this filter applies to
}

export interface TextWidget extends BaseWidget {
  type: 'text';
  content: string;
  format: 'markdown' | 'html' | 'plain';
}

export interface TableWidget extends BaseWidget {
  type: 'table';
  columns: Array<{ field: string; header: string; format?: string }>;
  data: any[];
  pagination: { enabled: boolean; pageSize: number };
  sortable: boolean;
}

export interface KPIWidget extends BaseWidget {
  type: 'kpi';
  value: number | string;
  format: string;
  trend?: { value: number; direction: 'up' | 'down' | 'flat' };
  target?: number;
}

export interface DividerWidget extends BaseWidget {
  type: 'divider';
  orientation: 'horizontal' | 'vertical';
}

export type DashboardWidget =
  | ChartWidget
  | FilterWidget
  | TextWidget
  | TableWidget
  | KPIWidget
  | DividerWidget;

export interface DashboardConfig {
  title: string;
  description: string;
  author?: string;
  created?: Date;
  updated?: Date;
  layout: {
    cols: number;
    rowHeight: number;
    margin: [number, number];
    containerPadding: [number, number];
  };
  theme: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    fontFamily: string;
  };
  accessibility: {
    wcagLevel: 'A' | 'AA' | 'AAA';
    skipNavigation: boolean;
    landmarkRoles: boolean;
  };
}

export interface DashboardSpec {
  config: DashboardConfig;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
}

export interface DashboardFilter {
  id: string;
  field: string;
  type: 'global' | 'widget';
  targets: string[];
  defaultValue: any;
}

/* ============================================================================
 * Default Config
 * ============================================================================ */

const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  title: 'Akashic Civics Dashboard',
  description: 'Disparity analysis dashboard',
  layout: {
    cols: 12,
    rowHeight: 40,
    margin: [10, 10],
    containerPadding: [20, 20],
  },
  theme: {
    backgroundColor: '#ffffff',
    textColor: '#1a1a2e',
    accentColor: '#E69F00',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  accessibility: {
    wcagLevel: 'AA',
    skipNavigation: true,
    landmarkRoles: true,
  },
};

/* ============================================================================
 * Dashboard Builder
 * ============================================================================ */

export class DashboardBuilder {
  public spec: DashboardSpec;
  private widgetIdCounter = 0;

  constructor(config?: Partial<DashboardConfig>) {
    this.spec = {
      config: { ...DEFAULT_DASHBOARD_CONFIG, ...config },
      widgets: [],
      filters: [],
    };
  }

  /* ------------------------------------------------------------------ *
   * Widget factory methods
   * ------------------------------------------------------------------ */

  private newId(prefix: string): string {
    return `${prefix}_${++this.widgetIdCounter}_${Date.now()}`;
  }

  private baseWidget(type: WidgetType, title: string, position: WidgetPosition): BaseWidget {
    return {
      id: this.newId(type),
      type,
      title,
      position,
      visible: true,
      accessibility: {
        ariaLabel: title,
        tabIndex: 0,
      },
    };
  }

  /**
   * Add a chart widget (from InteractiveVisualizer or DisparityVisualizer).
   */
  addChart(chartSpec: D3ChartSpec | VizSpec, position: WidgetPosition): this {
    const widget: ChartWidget = {
      ...this.baseWidget('chart', chartSpec.chart_title, position),
      type: 'chart',
      chartSpec,
    };
    this.spec.widgets.push(widget);
    return this;
  }

  /**
   * Add a filter widget that controls other widgets.
   */
  addFilter(
    filterField: string,
    filterType: FilterWidget['filterType'],
    options: FilterWidget['options'],
    targets: string[],
    defaultValue: any,
    position: WidgetPosition
  ): this {
    const widget: FilterWidget = {
      ...this.baseWidget('filter', `Filter: ${filterField}`, position),
      type: 'filter',
      filterField,
      filterType,
      options,
      defaultValue,
      targets,
    };
    this.spec.widgets.push(widget);
    this.spec.filters.push({
      id: widget.id,
      field: filterField,
      type: 'widget',
      targets,
      defaultValue,
    });
    return this;
  }

  /**
   * Add a global filter (applies to all compatible widgets).
   */
  addGlobalFilter(
    filterField: string,
    filterType: FilterWidget['filterType'],
    options: FilterWidget['options'],
    defaultValue: any,
    position: WidgetPosition
  ): this {
    const widget: FilterWidget = {
      ...this.baseWidget('filter', `Global Filter: ${filterField}`, position),
      type: 'filter',
      filterField,
      filterType,
      options,
      defaultValue,
      targets: ['*'],
    };
    this.spec.widgets.push(widget);
    this.spec.filters.push({
      id: widget.id,
      field: filterField,
      type: 'global',
      targets: ['*'],
      defaultValue,
    });
    return this;
  }

  /**
   * Add a text/markdown widget.
   */
  addText(content: string, position: WidgetPosition, format: 'markdown' | 'html' | 'plain' = 'markdown'): this {
    const widget: TextWidget = {
      ...this.baseWidget('text', 'Text', position),
      type: 'text',
      content,
      format,
    };
    this.spec.widgets.push(widget);
    return this;
  }

  /**
   * Add a KPI/metric card.
   */
  addKPI(
    value: number | string,
    format: string,
    position: WidgetPosition,
    trend?: KPIWidget['trend'],
    target?: number
  ): this {
    const widget: KPIWidget = {
      ...this.baseWidget('kpi', 'Key Metric', position),
      type: 'kpi',
      value,
      format,
      trend,
      target,
    };
    this.spec.widgets.push(widget);
    return this;
  }

  /**
   * Add a data table widget.
   */
  addTable(
    columns: TableWidget['columns'],
    data: any[],
    position: WidgetPosition,
    options: { pagination?: boolean; pageSize?: number; sortable?: boolean } = {}
  ): this {
    const widget: TableWidget = {
      ...this.baseWidget('table', 'Data Table', position),
      type: 'table',
      columns,
      data,
      pagination: { enabled: options.pagination ?? true, pageSize: options.pageSize ?? 25 },
      sortable: options.sortable ?? true,
    };
    this.spec.widgets.push(widget);
    return this;
  }

  /**
   * Add a divider.
   */
  addDivider(orientation: 'horizontal' | 'vertical', position: WidgetPosition): this {
    const widget: DividerWidget = {
      ...this.baseWidget('divider', 'Divider', position),
      type: 'divider',
      orientation,
    };
    this.spec.widgets.push(widget);
    return this;
  }

  /* ------------------------------------------------------------------ *
   * Layout helpers
   * ------------------------------------------------------------------ */

  /**
   * Auto-layout widgets in a grid (rows x cols).
   */
  autoLayout(widgetsPerRow: number = 3): this {
    const widgets = this.spec.widgets.filter((w) => w.type !== 'filter');
    let row = 0;
    let col = 0;

    for (const widget of widgets) {
      const w = Math.floor(12 / widgetsPerRow);
      widget.position = {
        x: col * w,
        y: row * 15,
        w,
        h: 15,
      };
      col++;
      if (col >= widgetsPerRow) {
        col = 0;
        row++;
      }
    }

    // Place filters at top
    const filterWidgets = this.spec.widgets.filter((w) => w.type === 'filter');
    filterWidgets.forEach((fw, i) => {
      fw.position = { x: i * 4, y: 0, w: 4, h: 3 };
    });

    return this;
  }

  /**
   * Set widget position manually (drag-and-drop).
   */
  setWidgetPosition(widgetId: string, position: WidgetPosition): this {
    const widget = this.spec.widgets.find((w) => w.id === widgetId);
    if (widget) {
      widget.position = position;
    }
    return this;
  }

  /**
   * Remove a widget by ID.
   */
  removeWidget(widgetId: string): this {
    this.spec.widgets = this.spec.widgets.filter((w) => w.id !== widgetId);
    this.spec.filters = this.spec.filters.filter((f) => f.id !== widgetId);
    return this;
  }

  /**
   * Toggle widget visibility.
   */
  toggleWidget(widgetId: string, visible: boolean): this {
    const widget = this.spec.widgets.find((w) => w.id === widgetId);
    if (widget) {
      widget.visible = visible;
    }
    return this;
  }

  /* ------------------------------------------------------------------ *
   * Dashboard metadata
   * ------------------------------------------------------------------ */

  setTitle(title: string): this {
    this.spec.config.title = title;
    return this;
  }

  setDescription(description: string): this {
    this.spec.config.description = description;
    return this;
  }

  setTheme(theme: Partial<DashboardConfig['theme']>): this {
    this.spec.config.theme = { ...this.spec.config.theme, ...theme };
    return this;
  }

  setAccessibility(accessibility: Partial<DashboardConfig['accessibility']>): this {
    this.spec.config.accessibility = { ...this.spec.config.accessibility, ...accessibility };
    return this;
  }

  /* ------------------------------------------------------------------ *
   * Build & Export
   * ------------------------------------------------------------------ */

  build(): DashboardSpec {
    this.spec.config.updated = new Date();
    return { ...this.spec };
  }

  /**
   * Export dashboard as HTML (self-contained, includes D3.js and rendering logic).
   */
  exportHTML(options?: { includeD3?: boolean; embedCSS?: boolean }): string {
    const { includeD3 = true, embedCSS = true } = options ?? {};
    const { config, widgets, filters } = this.build();

    const d3Script = includeD3
      ? '<script src="https://d3js.org/d3.v7.min.js"></script>'
      : '<!-- D3.js not included - add your own -->';

    const css = embedCSS ? this.getDashboardCSS() : '';

    const widgetHTML = widgets
      .filter((w) => w.visible)
      .map((w) => this.renderWidget(w))
      .join('\n');

    const filterJS = filters
      .map((f) => this.renderFilterJS(f))
      .join('\n');

    const chartJS = widgets
      .filter((w) => w.visible && w.type === 'chart')
      .map((w) => this.renderChartJS(w as ChartWidget))
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <meta name="description" content="${config.description}">
  ${d3Script}
  ${css ? `<style>${css}</style>` : ''}
  <style>
    :root {
      --bg-color: ${config.theme.backgroundColor};
      --text-color: ${config.theme.textColor};
      --accent-color: ${config.theme.accentColor};
      --font-family: ${config.theme.fontFamily};
    }
    * { box-sizing: border-box; }
    body { font-family: var(--font-family); color: var(--text-color); background: var(--bg-color); margin: 0; }
    .ak-dashboard { display: grid; grid-template-columns: repeat(${config.layout.cols}, 1fr); gap: ${config.layout.margin[0]}px ${config.layout.margin[1]}px; padding: ${config.layout.containerPadding[0]}px ${config.layout.containerPadding[1]}px; }
    .ak-widget { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 16px; display: flex; flex-direction: column; }
    .ak-widget-header { font-weight: 600; margin-bottom: 12px; color: var(--accent-color); }
    .ak-widget-content { flex: 1; min-height: 0; }
    .ak-kpi-value { font-size: 2.5rem; font-weight: 700; color: var(--accent-color); }
    .ak-kpi-trend { font-size: 1rem; }
    .ak-kpi-trend.up { color: #009E73; }
    .ak-kpi-trend.down { color: #D55E00; }
    .ak-table { width: 100%; border-collapse: collapse; }
    .ak-table th, .ak-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; }
    .ak-filter { margin-bottom: 8px; }
    .ak-divider { border: none; border-top: 2px solid var(--accent-color); margin: 8px 0; }
  </style>
</head>
<body>
  ${config.accessibility.skipNavigation ? '<a href="#main-content" class="skip-link">Skip to main content</a>' : ''}
  <main id="main-content" class="ak-dashboard" role="main" ${config.accessibility.landmarkRoles ? 'aria-label="Dashboard"' : ''}>
    <header style="grid-column: 1 / -1;" class="ak-widget">
      <h1>${config.title}</h1>
      <p>${config.description}</p>
    </header>
    ${widgetHTML}
  </main>
  <script>
    ${filterJS}
    ${chartJS}
    // Dashboard initialization
    document.addEventListener('DOMContentLoaded', () => {
      console.log('Dashboard "${config.title}" loaded');
    });
  </script>
</body>
</html>`;
  }

  /**
   * Export dashboard as Markdown (for PDF conversion via pandoc/remark).
   */
  exportMarkdown(): string {
    const { config, widgets } = this.build();

    let md = `# ${config.title}\n\n${config.description}\n\n`;

    for (const widget of widgets.filter((w) => w.visible)) {
      md += `## ${widget.title}\n\n`;

      switch (widget.type) {
        case 'chart':
          md += `*Chart: ${(widget as ChartWidget).chartSpec.chart_type}*\n\n`;
          md += `> ${(widget as ChartWidget).chartSpec.description}\n\n`;
          if ((widget as ChartWidget).chartSpec.limitations.length > 0) {
            md += `**Limitations:**\n`;
            (widget as ChartWidget).chartSpec.limitations.forEach((l) => (md += `- ${l}\n`));
            md += `\n`;
          }
          break;
        case 'text':
          md += `${(widget as TextWidget).content}\n\n`;
          break;
        case 'kpi':
          const kpi = widget as KPIWidget;
          md += `**Value:** ${kpi.value}\n\n`;
          if (kpi.trend) {
            md += `**Trend:** ${kpi.trend.direction} (${kpi.trend.value})\n\n`;
          }
          break;
        case 'table':
          const table = widget as TableWidget;
          const headers = table.columns.map((c) => c.header).join(' | ');
          const sep = table.columns.map(() => '---').join(' | ');
          md += `| ${headers} |\n| ${sep} |\n`;
          for (const row of table.data.slice(0, 10)) {
            const vals = table.columns.map((c) => String(row[c.field] ?? '')).join(' | ');
            md += `| ${vals} |\n`;
          }
          if (table.data.length > 10) {
            md += `*... and ${table.data.length - 10} more rows*\n`;
          }
          md += `\n`;
          break;
        default:
          break;
      }
    }

    return md;
  }

  /**
   * Export as JSON spec (for storage/transfer).
   */
  exportJSON(): string {
    return JSON.stringify(this.build(), null, 2);
  }

  /* ------------------------------------------------------------------ *
   * Internal render helpers
   * ------------------------------------------------------------------ */

  private renderWidget(widget: DashboardWidget): string {
    const { x, y, w, h } = widget.position;
    const gridCol = `grid-column: ${x + 1} / span ${w}; grid-row: ${y + 1} / span ${h};`;

    const header = `<div class="ak-widget-header" id="${widget.id}-header">${widget.title}</div>`;

    let content = '';
    switch (widget.type) {
      case 'chart':
        content = `<div class="ak-widget-content" id="${widget.id}-chart" role="img" aria-labelledby="${widget.id}-header" aria-describedby="${widget.id}-desc"></div><p id="${widget.id}-desc" class="sr-only">${(widget as ChartWidget).chartSpec.description}</p>`;
        break;
      case 'filter':
        const fw = widget as FilterWidget;
        content = `<div class="ak-widget-content"><div class="ak-filter"><label for="${widget.id}-select">${fw.filterField}</label><select id="${widget.id}-select">${fw.options.map((o) => `<option value="${o.value}" ${o.value === fw.defaultValue ? 'selected' : ''}>${o.label}</option>`).join('')}</select></div></div>`;
        break;
      case 'text':
        const tw = widget as TextWidget;
        content = `<div class="ak-widget-content">${tw.format === 'html' ? tw.content : tw.format === 'markdown' ? this.escapeHTML(tw.content) : tw.content}</div>`;
        break;
      case 'kpi':
        const kw = widget as KPIWidget;
        content = `<div class="ak-widget-content"><div class="ak-kpi-value">${kw.value}</div>${kw.trend ? `<div class="ak-kpi-trend ${kw.trend.direction}">${kw.trend.direction === 'up' ? '↑' : kw.trend.direction === 'down' ? '↓' : '→'} ${kw.trend.value}</div>` : ''}${kw.target ? `<div>Target: ${kw.target}</div>` : ''}</div>`;
        break;
      case 'table':
        const tab = widget as TableWidget;
        content = `<div class="ak-widget-content" style="overflow-x:auto;"><table class="ak-table"><thead><tr>${tab.columns.map((c) => `<th>${c.header}</th>`).join('')}</tr></thead><tbody>${tab.data.slice(0, tab.pagination.pageSize).map((r) => `<tr>${tab.columns.map((c) => `<td>${r[c.field] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>${tab.data.length > tab.pagination.pageSize ? `<p>Showing ${tab.pagination.pageSize} of ${tab.data.length} rows</p>` : ''}</div>`;
        break;
      case 'divider':
        content = `<hr class="ak-divider" ${widget.orientation === 'vertical' ? 'style="width: 2px; height: 100%; border-left: 2px solid var(--accent-color); border-top: none;"' : ''} />`;
        break;
    }

    return `<section class="ak-widget" style="${gridCol}" role="region" aria-labelledby="${widget.id}-header">${header}${content}</section>`;
  }

  private renderFilterJS(filter: DashboardFilter): string {
    return `
    // Filter: ${filter.field}
    const ${filter.id} = document.getElementById('${filter.id}-select');
    if (${filter.id}) {
      ${filter.id}.addEventListener('change', (e) => {
        const val = e.target.value;
        console.log('Filter ${filter.field} changed to', val);
        // In a full implementation, this would filter linked charts
      });
    }`;
  }

  private renderChartJS(widget: ChartWidget): string {
    const spec = widget.chartSpec;
    return `
    // Chart: ${widget.id}
    (function() {
      const container = document.getElementById('${widget.id}-chart');
      if (!container) return;
      // Placeholder for D3.js rendering logic
      // spec: ${JSON.stringify(spec).slice(0, 200)}...
      container.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">Chart: ${spec.chart_type} - ${spec.chart_title}</p>';
    })();`;
  }

  private getDashboardCSS(): string {
    return `
/* Accessibility */
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.skip-link { position: absolute; top: -40px; left: 0; background: var(--accent-color); color: white; padding: 8px; z-index: 100; }
.skip-link:focus { top: 0; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;
  }

  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  }
}

/* ============================================================================
 * Convenience: build a dashboard from multiple VizConfigs
 * ============================================================================ */

export interface DashboardBuildOptions {
  title: string;
  description: string;
  charts: Array<{ spec: D3ChartSpec | VizSpec; position?: WidgetPosition }>;
  globalFilters?: Array<{
    field: string;
    type: FilterWidget['filterType'];
    options: FilterWidget['options'];
    defaultValue: any;
  }>;
  theme?: Partial<DashboardConfig['theme']>;
}

export function buildDashboard(options: DashboardBuildOptions): DashboardBuilder {
  const builder = new DashboardBuilder({ title: options.title, description: options.description });

  if (options.theme) {
    builder.setTheme(options.theme);
  }

  // Add charts
  for (const chart of options.charts) {
    builder.addChart(chart.spec, chart.position ?? { x: 0, y: 0, w: 6, h: 15 });
  }

  // Add global filters
  if (options.globalFilters) {
    options.globalFilters.forEach((f, i) => {
      builder.addGlobalFilter(f.field, f.type, f.options, f.defaultValue, { x: i * 4, y: 0, w: 4, h: 3 });
    });
  }

  builder.autoLayout(3);
  return builder;
}