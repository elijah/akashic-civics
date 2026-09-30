/**
 * Disparity Visualization Templates
 * Creates instantly readable charts and dashboards for public consumption
 */

export interface VizConfig {
  type: 'bar' | 'trend' | 'heatmap' | 'judge' | 'sentence' | 'disposition';
  title: string;
  data: any[];
  config: {
    primary_group: string;
    reference_group: string;
    group_var: string;
    metric: string;
    time_var?: string;
    min_cases?: number;
  };
}

export interface VizSpec {
  chart_type: string;
  chart_title: string;
  x_axis: { label: string; field: string };
  y_axis: { label: string; field: string };
  color_variable: string;
  description: string;
  limitations: string[];
  audience_notes: string[];
}

/**
 * Generate chart specifications for different visualization types
 */
export class DisparityVisualizer {
  
  /**
   * Bar Chart: Conviction rates by demographic group
   */
  barChartConvictionRates(config: VizConfig): VizSpec {
    return {
      chart_type: 'bar',
      chart_title: config.title || 'Conviction Rates by Demographic Group',
      x_axis: { label: config.config.group_var.replace(/_/g, ' '), field: config.config.group_var },
      y_axis: { label: `${config.config.metric.replace(/_/g, ' ')} (%)`, field: config.config.metric },
      color_variable: config.config.group_var,
      description: `Compare ${config.config.metric.replace(/_/g, ' ')} across different ${config.config.group_var.replace(/_/g, ' ')} groups. Each bar represents the rate for that group, making disparities immediately visible.`,
      limitations: [
        'Bars may not show statistical significance - check confidence intervals',
        'Small sample sizes may make rates unreliable',
        'Rates may be affected by case mix differences (controls needed for proper analysis)'
      ],
      audience_notes: [
        'Large gaps between bars indicate potential disparate treatment',
        'Check if your group has the lowest rate',
        'Compare to state or national benchmarks shown as reference line'
      ]
    };
  }

  /**
   * Trend Line: Disparity over time
   */
  trendLineDisparity(config: VizConfig): VizSpec {
    return {
      chart_type: 'line',
      chart_title: config.title || 'Disparity Trend Over Time',
      x_axis: { label: 'Time Period', field: config.config.time_var || 'year' },
      y_axis: { label: 'Disparity (percentage points gap)', field: 'gap' },
      color_variable: 'group',
      description: `Tracking how the disparity between ${config.config.primary_group} and ${config.config.reference_group} has changed over time. An increasing line (going up) indicates the gap is getting worse. A decreasing line shows improvement.`,
      limitations: [
        'Year-to-year fluctuations may be due to small sample sizes',
        'Requires at least 3-5 years of data for meaningful trends',
        'Policy changes, judge rotations, or external events may affect trajectories'
      ],
      audience_notes: [
        'A rising line = disparity getting worse',
        'A flat line = status quo maintained',
        'Ask: Has anything changed in local policies or practices during this period?',
        'Look for sudden changes that might correspond to specific events'
      ]
    };
  }

  /**
   * Heatmap: Disparity patterns across categories
   */
  heatmapDisparity(config: VizConfig): VizSpec {
    return {
      chart_type: 'heatmap',
      chart_title: config.title || 'Disparity Patterns Across Categories',
      x_axis: { label: 'Offense Type', field: 'charge_type' },
      y_axis: { label: 'Demographic Group', field: config.config.group_var },
      color_variable: 'disparity_rate',
      description: `A heatmap showing how disparities vary across different offense types and demographic groups. Darker colors indicate larger disparities. This helps identify if disparities are concentrated in specific offense categories or are widespread.`,
      limitations: [
        'Cells with small sample sizes should be interpreted cautiously',
        'Color scale may be affected by extreme values',
        'Requires large sample sizes for reliable cell-level estimates'
      ],
      audience_notes: [
        'Look for clusters of dark cells - these are areas of high concern',
        'White or light cells indicate areas where disparity is not observed',
        'Ask: Are disparities concentrated in certain offense types?',
        'Consider whether policy differences might explain patterns'
      ]
    };
  }

  /**
   * Judge Comparison: Individual decision-maker disparities
   */
  judgeComparison(config: VizConfig): VizSpec {
    return {
      chart_type: 'bar',
      chart_title: config.title || 'Conviction Rate Disparity by Judge',
      x_axis: { label: 'Judge Name', field: 'judge_name' },
      y_axis: { label: 'Conviction Rate Gap (percentage points)', field: 'gap' },
      color_variable: 'jurisdiction',
      description: `Each bar shows the conviction rate disparity (Black - White) for cases handled by a specific judge. Judges with positive values show higher conviction rates for Black defendants; negative values show the opposite. Bar length reflects magnitude of disparity.`,
      limitations: [
        'Requires sufficient case volume per judge (min 50-100 cases)',
        'Judge disparities reflect case mix as well as potential bias',
        'Individual judges handle different types of cases',
        'Small sample sizes may make individual judge rates unreliable'
      ],
      audience_notes: [
        'Judges with long bars in either direction warrant closer examination',
        'Compare judge disparities to jurisdiction average',
        'Consider whether judges handle different offense mixes',
        'Ask: Are certain judges systematically different from their peers?'
      ]
    };
  }

  /**
   * Sentence Length Distribution: Histogram with overlay
   */
  sentenceDistribution(config: VizConfig): VizSpec {
    return {
      chart_type: 'histogram',
      chart_title: config.title || 'Sentence Length Distribution by Demographic Group',
      x_axis: { label: 'Sentence Length (months)', field: 'sentence_months' },
      y_axis: { label: 'Number of Cases', field: 'count' },
      color_variable: config.config.group_var,
      description: `Overlaid histograms showing the distribution of sentence lengths for each demographic group. Mean values are marked with dashed lines. A wider distribution or longer tail for one group indicates potential disparate sentencing.`,
      limitations: [
        'Only includes cases that received a sentence (excludes dismissals, etc.)',
        'Requires large sample sizes for smooth distributions',
        'Sentence severity correlates with offense type - control needed for proper comparison'
      ],
      audience_notes: [
        'Overlapping distributions = relatively similar outcomes',
        'Widely separated distributions = significant sentencing disparity',
        'A longer tail for one group means some defendants get much longer sentences',
        'Compare mean positions - higher mean = longer typical sentences'
      ]
    };
  }

  /**
   * Disposition Flow: How cases progress through the system
   */
  dispositionFlow(config: VizConfig): VizSpec {
    return {
      chart_type: 'stacked',
      chart_title: config.title || 'Case Dispositions by Demographic Group',
      x_axis: { label: 'Demographic Group', field: config.config.group_var },
      y_axis: { label: 'Proportion of Cases (%)', field: 'proportion' },
      color_variable: 'disposition_type',
      description: `A stacked bar chart showing how cases flow through different outcomes (convicted, dismissed, diverted) for each demographic group. Differences in stack composition reveal where disparities emerge in the process.`,
      limitations: [
        'Requires complete case tracking from filing to disposition',
        'Proportions sum to 100% within each group, not overall totals',
        'May obscure absolute case count differences'
      ],
      audience_notes: [
        'Compare segment proportions across bars - similar heights = similar outcomes',
        'Look for groups with large differences in conviction vs. dismissal segments',
        'Note: A small proportion of a large group can represent many actual cases',
        'Ask: At what stage do outcomes diverge?'
      ]
    };
  }

  /**
   * Generate appropriate visualization based on data type
   */
  autoSelectViz(data: any[], config: Partial<VizConfig>['config']): VizSpec {
    const groupVar = config.group_var || 'race_ethnicity';
    const metric = config.metric || 'conviction_rate';
    
    // Determine best visualization based on data characteristics
    if (config.time_var && metric.includes('gap')) {
      return this.trendLineDisparity({
        type: 'trend',
        title: config.title || `Trend: ${metric.replace(/_/g, ' ')} Over Time`,
        data: [],
        config: config as any
      });
    }
    
    if (groupVar === 'judge_name' && data.some(d => d.judge_name)) {
      return this.judgeComparison({
        type: 'bar',
        title: config.title || 'Disparity by Judge',
        data: [],
        config: config as any
      });
    }
    
    if (metric === 'sentence_length') {
      return this.sentenceDistribution({
        type: 'sentence',
        title: config.title || 'Sentence Length Distribution',
        data: [],
        config: config as any
      });
    }
    
    if (metric === 'disposition') {
      return this.dispositionFlow({
        type: 'disposition',
        title: config.title || 'Case Outcomes by Group',
        data: [],
        config: config as any
      });
    }
    
    // Check for cross-tab style data (heatmap)
    if (data.length > 20 && data[0].charge_type) {
      return this.heatmapDisparity({
        type: 'heatmap',
        title: config.title || `Disparity by ${groupVar.replace(/_/g, ' ')} and Offense Type`,
        data: [],
        config: config as any
      });
    }
    
    // Default to bar chart
    return this.barChartConvictionRates({
      type: 'bar',
      title: config.title || `Rate by ${groupVar.replace(/_/g, ' ')}`,
      data: [],
      config: config as any
    });
  }
}

/**
 * Generate HTML embed code for visualizations
 */
export function generateEmbedCode(vizSpec: VizSpec, data: any[], width: string = '100%', height: string = '500px'): string {
  return `
<div class="akashic-viz" style="width: ${width}; height: ${height};">
  <div class="viz-header">
    <h3>${vizSpec.chart_title}</h3>
    <p class="description">${vizSpec.description}</p>
  </div>
  <div class="viz-content" style="height: calc(100% - 100px);">
    <!-- Visualization would be rendered here -->
    <div class="viz-placeholder" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; border: 2px dashed #ccc;">
      Chart: ${vizSpec.chart_type}
    </div>
  </div>
  <div class="viz-footer" style="padding: 10px; background: #f5f5f5; font-size: 12px;">
    <strong>Limitations:</strong>
    <ul>
${vizSpec.limitations.map(l => `      <li>${l}</li>`).join('\n')}
    </ul>
  </div>
  <div class="viz-notes" style="padding: 10px; background: #e8f4f8; font-size: 12px;">
    <strong>Key Insights:</strong>
    <ul>
${vizSpec.audience_notes.map(n => `      <li>${n}</li>`).join('\n')}
    </ul>
  </div>
</div>
  `.trim();
}
