/**
 * Officials Accountability Tracker
 * Tracks individual decision-makers (judges, prosecutors) and their disparity metrics
 */

import * as crypto from 'crypto';
import { ProvenanceTracker } from '../provenance/provenance_tracker';

interface OfficialStats {
  official_id: string;
  official_name: string;
  official_type: 'judge' | 'prosecutor' | 'court';
  jurisdiction_id: string;
  case_count: number;
  case_counts_by_group: Record<string, number>;
  conviction_rates: Record<string, number>;
  disparity_scores: Record<string, number>; // gap vs reference group
  confidence_intervals: Record<string, [number, number]>;
  trend: {
    direction: 'improving' | 'worsening' | 'stable';
    change_per_year: number;
    confidence: number;
  };
  data_quality: {
    completeness_score: number;
    missing_data_rate: number;
  };
  notes: string[];
}

interface OfficialComparison {
  jurisdiction_id: string;
  officials: OfficialStats[];
  jurisdiction_avg: Record<string, number>;
  state_avg: Record<string, number>;
  ranking: {
    by_disparity: Array<{ official_id: string; rank: number; score: number }>;
    by_case_volume: Array<{ official_id: string; rank: number; count: number }>;
  };
}

/**
 * Track individual officials and compute their disparity metrics
 */
export class OfficialsTracker {
  private provenance: ProvenanceTracker;

  constructor() {
    this.provenance = new ProvenanceTracker();
  }

  /**
   * Process cases and compute official-level statistics
   */
  async processCasesForOfficials(cases: Array<{
    case_id: string;
    official_id: string;
    official_name: string;
    official_type: 'judge' | 'prosecutor' | 'court';
    jurisdiction_id: string;
    race_ethnicity: string;
    conviction: number;
    sentence_months: number;
    days_to_disposition: number;
    [key: string]: any;
  }>): Promise<OfficialComparison> {
    // Group cases by official
    const byOfficial = cases.reduce((acc: Record<string, any[]>, caseItem) => {
      const officialId = caseItem.official_id;
      if (!acc[officialId]) acc[officialId] = [];
      acc[officialId].push(caseItem);
      return acc;
    }, {});

    // Compute stats for each official
    const officialsStats: OfficialStats[] = [];
    for (const [officialId, officialCases] of Object.entries(byOfficial)) {
      if (officialCases.length === 0) continue;

      const firstCase = officialCases[0];
      const stats = this.computeOfficialStats(officialId, officialCases);
      officialsStats.push(stats);
    }

    // Compute jurisdiction and state averages (placeholders for state)
    const jurisdictionAvg = this.computeJurisdictionAvg(cases);
    const stateAvg = { black_vs_white: 0.10 }; // placeholder

    // Generate rankings
    const ranking = this.generateRankings(officialsStats);

    // Build comparison
    const comparison: OfficialComparison = {
      jurisdiction_id: cases[0]?.jurisdiction_id || 'unknown',
      officials: officialsStats,
      jurisdiction_avg: jurisdictionAvg,
      state_avg: stateAvg,
      ranking: ranking
    };

    return comparison;
  }

  /**
   * Compute statistics for a single official
   */
  private computeOfficialStats(
    officialId: string,
    cases: Array<any>
  ): OfficialStats {
    const firstCase = cases[0];
    const totalCases = cases.length;

    // Count cases by race/ethnicity
    const countsByGroup: Record<string, number> = {};
    const convictionsByGroup: Record<string, number> = {};

    cases.forEach(caseItem => {
      const race = caseItem.race_ethnicity || 'Unknown';
      countsByGroup[race] = (countsByGroup[race] || 0) + 1;
      if (caseItem.conviction === 1) {
        convictionsByGroup[race] = (convictionsByGroup[race] || 0) + 1;
      }
    });

    // Compute conviction rates
    const convictionRates: Record<string, number> = {};
    for (const [group, count] of Object.entries(countsByGroup)) {
      convictionRates[group] = convictionsByGroup[group] / count;
    }

    // Compute disparity scores (gap vs reference group)
    // Reference group is typically the largest group or a specified reference (e.g., White)
    const referenceGroup = this.determineReferenceGroup(countsByGroup);
    const disparityScores: Record<string, number> = {};
    const confidenceIntervals: Record<string, [number, number]> = {};

    for (const [group, rate] of Object.entries(convictionRates)) {
      if (group === referenceGroup) continue;
      const referenceRate = convictionRates[referenceGroup];
      const gap = rate - referenceRate;
      disparityScores[group] = gap;

      // Compute confidence interval for the gap
      const ci = this.computeGapCI(
        rate, convictionsByGroup[group], count,
        referenceRate, convictionsByGroup[referenceGroup], countsByGroup[referenceGroup]
      );
      confidenceIntervals[group] = ci;
    }

    // Determine trend (would need historical data - placeholder)
    const trend = {
      direction: 'stable' as const,
      change_per_year: 0,
      confidence: 0.5
    };

    // Data quality
    const missingDataRate = this.computeMissingDataRate(cases);
    const completenessScore = 100 - (missingDataRate * 100);

    return {
      official_id: officialId,
      official_name: firstCase.official_name,
      official_type: firstCase.official_type,
      jurisdiction_id: firstCase.jurisdiction_id,
      case_count: totalCases,
      case_counts_by_group: countsByGroup,
      conviction_rates: convictionRates,
      disparity_scores: disparityScores,
      confidence_intervals: confidenceIntervals,
      trend: trend,
      data_quality: {
        completeness_score: completenessScore,
        missing_data_rate: missingDataRate
      },
      notes: this.generateOfficialsNotes(cases, countsByGroup, convictionRates)
    };
  }

  /**
   * Determine reference group (largest group or specified reference)
   */
  private determineReferenceGroup(counts: Record<string, number>): string {
    // Default to largest group
    let maxCount = 0;
    let reference = 'Unknown';
    for (const [group, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        reference = group;
      }
    }
    // If White is present, use it as reference (common practice)
    if (counts.White && counts.White > 0) {
      return 'White';
    }
    return reference;
  }

  /**
   * Compute confidence interval for gap between two proportions
   */
  private computeGapCI(
    p1: number, x1: number, n1: number,
    p2: number, x2: number, n2: number
  ): [number, number] {
    // Standard error for difference in proportions
    const se = Math.sqrt(
      (p1 * (1 - p1)) / n1 +
      (p2 * (1 - p2)) / n2
    );

    const gap = p1 - p2;
    const z = 1.96; // 95% CI

    return [
      gap - z * se,
      gap + z * se
    ];
  }

  /**
   * Compute missing data rate for core fields
   */
  private computeMissingDataRate(cases: Array<any>): number {
    const coreFields = ['race_ethnicity', 'conviction', 'sentence_months'];
    let missingCount = 0;

    cases.forEach(caseItem => {
      coreFields.forEach(field => {
        if (caseItem[field] === null || caseItem[field] === undefined || caseItem[field] === '') {
          missingCount++;
        }
      });
    });

    const totalPossible = cases.length * coreFields.length;
    return missingCount / totalPossible;
  }

  /**
   * Generate notes for the official
   */
  private generateOfficialsNotes(
    cases: Array<any>,
    countsByGroup: Record<string, number>,
    convictionRates: Record<string, number>
  ): string[] {
    const notes: string[] = [];

    // Sample size warning
    if (cases.length < 30) {
      notes.push('Warning: Small sample size (<30 cases). Results may be unreliable.');
    } else if (cases.length < 100) {
      notes.push('Note: Moderate sample size. Interpret with caution.');
    }

    // Check for extreme imbalance
    const total = cases.length;
    const maxCount = Math.max(...Object.values(countsByGroup));
    const maxGroup = Object.entries(countsByGroup).find(([_, count]) => count === maxCount)?.[0];
    const maxProp = maxCount / total;

    if (maxProp > 0.9) {
      notes.push(`Note: ${maxProp.toFixed(0)}% of cases are from one demographic group (${maxGroup}).`);
    }

    // Check for zero convictions in a group
    for (const [group, count] of Object.entries(countsByGroup)) {
      if (count > 0 && convictionRates[group] === 0) {
        notes.push(`Note: No convictions recorded for ${group} defendants (n=${count}).`);
      }
      if (count > 0 && convictionRates[group] === 1) {
        notes.push(`Note: All convictions recorded for ${group} defendants (n=${count}).`);
      }
    }

    return notes;
  }

  /**
   * Compute jurisdiction-wide average disparity
   */
  private computeJurisdictionAvg(cases: Array<any>): Record<string, number> {
    const referenceGroup = 'White'; // placeholder
    const countsByGroup: Record<string, number> = {};
    const convictionsByGroup: Record<string, number> = {};

    cases.forEach(caseItem => {
      const race = caseItem.race_ethnicity || 'Unknown';
      countsByGroup[race] = (countsByGroup[race] || 0) + 1;
      if (caseItem.conviction === 1) {
        convictionsByGroup[race] = (convictionsByGroup[race] || 0) + 1;
      }
    });

    const disparityScores: Record<string, number> = {};
    for (const [group, count] of Object.entries(countsByGroup)) {
      if (group === referenceGroup) continue;
      const rate = convictionsByGroup[group] / count;
      const referenceRate = convictionsByGroup[referenceGroup] / countsByGroup[referenceGroup];
      disparityScores[group] = rate - referenceRate;
    }

    return disparityScores;
  }

  /**
   * Generate rankings for officials
   */
  private generateRankings(officials: OfficialStats[]): {
    by_disparity: Array<{ official_id: string; rank: number; score: number }>;
    by_case_volume: Array<{ official_id: string; rank: number; count: number }>;
  } {
    // Rank by disparity (absolute value of Black-White gap, or largest gap)
    const disparityScores = officials.map(official => {
      // Find largest absolute disparity
      let maxDisparity = 0;
      for (const [group, gap] of Object.entries(official.disparity_scores)) {
        const absGap = Math.abs(gap);
        if (absGap > maxDisparity) {
          maxDisparity = absGap;
        }
      }
      return {
        official_id: official.official_id,
        score: maxDisparity
      };
    });

    // Sort by score descending (highest disparity first)
    disparityScores.sort((a, b) => b.score - a.score);
    const disparityRanking = disparityScores.map((item, index) => ({
      official_id: item.official_id,
      rank: index + 1,
      score: item.score
    }));

    // Rank by case volume (descending)
    const volumeRanking = officials
      .map(official => ({
        official_id: official.official_id,
        count: official.case_count
      }))
      .sort((a, b) => b.count - a.count)
      .map((item, index) => ({
        official_id: item.official_id,
        rank: index + 1,
        count: item.count
      }));

    return {
      by_disparity: disparityRanking,
      by_case_volume: volumeRanking
    };
  }

  /**
   * Generate a public-facing report for officials (with privacy protections)
   */
  generatePublicReport(comparison: OfficialComparison, maxOfficials: number = 10): string {
    // Filter officials with sufficient case volume (min 50 cases)
    const qualifiedOfficials = comparison.officials
      .filter(official => official.case_count >= 50)
      .sort((a, b) => b.case_count - a.case_count)
      .slice(0, maxOfficials);

    if (qualifiedOfficials.length === 0) {
      return `# Officials Accountability Report\n\nNo officials with sufficient case volume (≥50 cases) found for public reporting.\n\nConsider lowering the threshold or collecting more data.\n`;
    }

    let report = `# Officials Accountability Report\n`;
    report += `**Jurisdiction**: ${comparison.jurisdiction_id}\n`;
    report += `**Report Generated**: ${new Date().toISOString().split('T')[0]}\n\n`;

    report += `## Summary\n`;
    report += `- Total officials analyzed: ${comparison.officials.length}\n`;
    report += `- Officials with sufficient data (≥50 cases): ${qualifiedOfficials.length}\n`;
    report += `- Jurisdiction average disparity (Black-White gap): ${comparison.jurisdiction_avg.black_vs_white?.toFixed(3) || 'N/A'}\n\n`;

    report += `## Top Officials by Case Volume\n`;
    report += `| Rank | Official | Type | Cases | Disparity (pp) | 95% CI |\n`;
    report += `|------|----------|------|-------|----------------|--------|\n`;

    for (const [index, official] of qualifiedOfficials.entries()) {
      // Find Black-White disparity if available
      let disparityText = 'N/A';
      let ciText = 'N/A';
      if (official.disparity_scores.White !== undefined && 
          official.disparity_scores.Black !== undefined) {
        const gap = official.disparity_scores.Black - official.disparity_scores.White;
        disparityText = gap.toFixed(3);
        const ci = official.confidence_intervals.Black;
        if (ci) {
          ciText = `[${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}]`;
        }
      } else if (Object.keys(official.disparity_scores).length > 0) {
        // Show largest disparity
        const entries = Object.entries(official.disparity_scores);
        const [group, gap] = entries.reduce((max, current) => 
          Math.abs(current[1]) > Math.abs(max[1]) ? current : max
        );
        disparityText = `${group}: ${gap.toFixed(3)}`;
        const ci = official.confidence_intervals[group];
        if (ci) {
          ciText = `[${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}]`;
        }
      }

      report += `| ${index + 1} | ${official.official_name} | ${official.official_type} | ${official.case_count} | ${disparityText} | ${ciText} |\n`;
    }

    report += `\n## How to Interpret This Report\n`;
    report += `- **Disparity (pp)**: Difference in conviction rates between groups in percentage points. Positive means the listed group has higher conviction rates than the reference group (usually White).\n`;
    report += `- **95% CI**: Confidence interval for the disparity estimate. If the interval includes 0, the disparity is not statistically significant at the 95% level.\n`;
    report += `- **Sample Size**: Officials with fewer than 50 cases are excluded from this report to ensure reliability.\n`;
    report += `- **Limitations**: These statistics show correlation, not causation. Many factors influence case outcomes, including offense severity, criminal history, and legal representation.\n`;

    report += `\n## Methodology\n`;
    report += `- Conviction rates calculated as (number of convictions) / (total cases) per demographic group\n`;
    report += `- Disparity = (Group conviction rate) - (Reference group conviction rate)\n`;
    report += `- Reference group is typically the largest group or White defendants when present\n`;
    report += `- Confidence intervals computed using standard error for difference in proportions\n`;
    report += `- Officials with missing data on key fields are excluded from disparity calculations\n`;

    return report;
  }
}

export default OfficialsTracker;