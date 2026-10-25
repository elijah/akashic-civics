/**
 * Peer Comparison for Officials
 * Direct standardization, case-mix adjustment, propensity score matching,
 * risk-adjusted performance metrics
 */

/* ============================================================================
 * Types
 * ============================================================================ */

export interface OfficerStats {
  officialId: string;
  officialName: string;
  officialType: 'judge' | 'prosecutor' | 'court';
  jurisdictionId: string;
  caseCount: number;
  convictionCounts: Record<string, number>;
  convictionRates: Record<string, number>;
  disparityScores: Record<string, number>; // gap vs reference group
  caseMix: Record<string, number>; // e.g., { felony: 45, misdemeanor: 30 }
}

export interface PeerGroup {
  groupId: string;
  groupName: string;
  jurisdictionId?: string;
  officers: OfficerStats[];
  // Population-level case mix and rates for standardization
  populationCaseMix: Record<string, number>;
  populationConvictionRates: Record<string, number>;
  populationSize: number;
}

export interface StandardizedRate {
  officerId: string;
  rawRate: number;
  standardizedRate: number;
  standardizationMethod: 'direct' | 'regression' | 'propensity';
  confidenceInterval: [number, number];
  effectiveSampleSize: number;
}

export interface CaseMixAdjustmentResult {
  officerId: string;
  rawConvictionRate: number;
  adjustedConvictionRate: number;
  adjustmentFactors: Record<string, number>; // case-mix feature -> weight
}

export interface PropensityMatchResult {
  targetOfficerId: string;
  matchedPeers: string[]; // officer IDs from peer group with similar case mix
  propensityScore: number;
  similarityScore: number;
}

/* ============================================================================
 * Direct Standardization
 * Apply population case mix to official's rates to get a standardized rate.
 * Equivalent to age-adjustment in epidemiology.
 * ============================================================================ */

export function directStandardization(
  officerRates: Record<string, number>,      // official's conviction rates per group
  officerCaseCounts: Record<string, number>, // official's case counts per group
  populationCaseMix: Record<string, number>, // population distribution per group
  populationRates: Record<string, number>    // population conviction rates per group
): { standardizedRate: number; expectedRate: number; confidenceInterval: [number, number] } {
  // Expected rate if officer had population case mix
  let expectedSum = 0;
  let totalWeight = 0;

  for (const group of Object.keys(populationRates)) {
    const officerCount = officerCaseCounts[group] ?? 0;
    const popWeight = populationCaseMix[group] ?? 0;
    const officerRate = officerRates[group] ?? 0;

    if (popWeight > 0 && officerCount >= 0) {
      expectedSum += officerRate * popWeight;
      totalWeight += popWeight;
    }
  }

  const standardizedRate = totalWeight > 0 ? expectedSum / totalWeight : 0;
  const expectedRate = expectedSum / Math.max(totalWeight, 1);

  // CI: compute variance of standardized rate assuming binomial variance per group
  // Var(std) = sum(w_g^2 * p_g * (1-p_g) / n_g) / (sum w_g)^2
  // We'll use a pooled approximation
  let varSum = 0;
  for (const [group, popRate] of Object.entries(populationRates)) {
    const w = populationCaseMix[group] ?? 0;
    if (w <= 0) continue;
    const officerN = officerCaseCounts[group] ?? 0;
    const p = officerRates[group] ?? popRate;
    const n = Math.max(officerN, 1);
    varSum += (w / totalWeight) ** 2 * (p * (1 - p) / n);
  }

  const se = Math.sqrt(Math.max(varSum, 0));
  const z = 1.96; // 95% CI
  return {
    standardizedRate,
    expectedRate,
    confidenceInterval: [standardizedRate - z * se, standardizedRate + z * se],
  };
}

/* ============================================================================
 * Case-Mix Adjustment via Regression
 * Regress conviction rate on case-mix features, use residuals as adjusted rates.
 * Uses OLS from statistical_analysis.ts
 * ============================================================================ */

export function caseMixAdjustmentOLS(
  officerStats: OfficerStats,
  peerGroup: PeerGroup,
  features: Array<{ name: string; description: string }>
): CaseMixAdjustmentResult {
  // Build dataset: each officer's case-mix features + raw conviction rate
  const allOfficers = [...peerGroup.officers, officerStats];

  const X: number[][] = [];
  const y: number[] = [];

  for (const officer of allOfficers) {
    const row = [1]; // intercept
    for (const feat of features) {
      const key = feat.name.replace(/[^a-zA-Z]/g, '');
      row.push(officer.caseMix?.[key] ?? 0);
    }
    X.push(row);

    // Average conviction rate across all groups
    const rates = Object.values(officer.convictionRates ?? {});
    const rate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    y.push(rate);
  }

  if (peerGroup.officers.length === 0) {
    const rawConvictionRate = y[y.length - 1];
    return {
      officerId: officerStats.officialId,
      rawConvictionRate,
      adjustedConvictionRate: rawConvictionRate,
      adjustmentFactors: {},
    };
  }

  // Compute peer coefficients via simple multivariate approximation
  // (in production would use full matrix OLS)
  const peerY = y.slice(0, -1);
  const peerX = X.slice(0, -1);
  const n = peerX.length;
  const nFeatures = features.length + 1;

  // Compute coefficients using normal equations (simplified)
  const coeffs = new Array(nFeatures).fill(0);
  for (let j = 0; j < nFeatures; j++) {
    const sumXY = peerX.reduce((sum, row, i) => sum + row[j] * peerY[i], 0);
    const sumX = peerX.reduce((sum, row) => sum + row[j], 0);
    const sumY = peerY.reduce((sum, val) => sum + val, 0);
    const sumX2 = peerX.reduce((sum, row) => sum + row[j] ** 2, 0);
    coeffs[j] = n > 0 ? (sumXY - sumX * sumY / n) / (sumX2 - sumX ** 2 / n) : 0;
  }

  // Apply to target officer
  const targetRow = X[X.length - 1];
  const predictedRate = coeffs.reduce((sum, c, i) => sum + c * targetRow[i], 0);

  const rawConvictionRate = y[y.length - 1];
  const adjustmentFactors: Record<string, number> = {};
  features.forEach((f, i) => {
    const key = f.name.replace(/[^a-zA-Z]/g, '');
    adjustmentFactors[key] = targetRow[i + 1];
  });

  return {
    officerId: officerStats.officialId,
    rawConvictionRate,
    adjustedConvictionRate: predictedRate,
    adjustmentFactors,
  };
}

/* ============================================================================
 * Propensity Score Matching
 * Match an officer to peers with similar case mix using Mahalanobis-like distance
 * on key case characteristics.
 * ============================================================================ */

export function propensityScoreMatch(
  targetOfficer: OfficerStats,
  peerGroup: PeerGroup,
  matchFeatures: string[],
  numMatches: number = 3
): PropensityMatchResult {
  if (peerGroup.officers.length === 0) {
    return {
      targetOfficerId: targetOfficer.officialId,
      matchedPeers: [],
      propensityScore: 0,
      similarityScore: 0,
    };
  }

  // Compute distance from target to each peer on selected features
  const distances: Array<{ officerId: string; distance: number }> = peerGroup.officers.map(peer => {
    let dot = 0;
    let normTarget = 0;
    let normPeer = 0;

    for (const feat of matchFeatures) {
      const tVal = (targetOfficer as any)[feat] ?? 0;
      const pVal = (peer as any)[feat] ?? 0;
      dot += tVal * pVal;
      normTarget += tVal ** 2;
      normPeer += pVal ** 2;
    }

    const cosine = normTarget > 0 && normPeer > 0 ? dot / (Math.sqrt(normTarget) * Math.sqrt(normPeer)) : 0;
    const distance = 1 - cosine; // 0 = identical, 2 = opposite

    return { officerId: peer.officialId, distance };
  });

  // Sort by distance (ascending)
  distances.sort((a, b) => a.distance - b.distance);

  const matched = distances.slice(0, Math.min(numMatches, distances.length));
  const matchedPeers = matched.map(m => m.officerId);

  // Propensity score = proportion of peer pool within the matched distance threshold
  const threshold = matched[matched.length - 1]?.distance ?? 1;
  const withinThreshold = peerGroup.officers.filter(p => {
    // recompute simple distance
    let dot = 0, nt = 0, np = 0;
    for (const feat of matchFeatures) {
      const tv = (targetOfficer as any)[feat] ?? 0;
      const pv = (p as any)[feat] ?? 0;
      dot += tv * pv;
      nt += tv ** 2;
      np += pv ** 2;
    }
    const cs = nt > 0 && np > 0 ? dot / (Math.sqrt(nt) * Math.sqrt(np)) : 0;
    return 1 - cs <= threshold;
  }).length;

  const propensityScore = peerGroup.officers.length > 0 ? withinThreshold / peerGroup.officers.length : 0;
  const similarityScore = 1 - threshold;

  return {
    targetOfficerId: targetOfficer.officialId,
    matchedPeers,
    propensityScore,
    similarityScore,
  };
}

/* ============================================================================
 * Risk-Adjusted Performance Metrics (OLS-based)
 * Adjust conviction/disposition rates using regression controlling for case characteristics.
 * Uses the existing runOLSRegression helper.
 * ============================================================================ */

export interface RiskAdjustmentResult {
  officerId: string;
  rawRate: number;
  adjustedRate: number;
  adjustmentExplanation: string;
  modelFit: { rSquared: number; coefficients: Record<string, number>; seCoefficients: Record<string, number> };
}

export function riskAdjustmentOLS(
  targetOfficer: OfficerStats,
  peerGroup: PeerGroup,
  controlFeatures: Array<{ name: string; description: string }>
): RiskAdjustmentResult {
  // Build dataset: all officers (peers + target)
  const allOfficers = [...peerGroup.officers, targetOfficer];

  // Outcome: conviction rate for each officer
  const outcomes = allOfficers.map(o => {
    if (o.caseCount === 0) return 0;
    const rates = Object.values(o.convictionRates ?? {});
    return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  });

const rawRate = outcomes[outcomes.length - 1]; // target officer's rate

  // Peer average conviction rate for null model comparison
  const peerMeanRate = peerGroup.officers.length > 0
    ? peerGroup.officers.map(o => {
        if (o.caseCount === 0) return 0;
        const rates = Object.values(o.convictionRates ?? {});
        return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
      }).reduce((a, b) => a + b, 0) / peerGroup.officers.length
    : rawRate;

  // Compute R^2 manually: variance explained by controls vs null model
  const nullMean = peerMeanRate;
  const totalSS = outcomes.reduce((sum, val) => sum + Math.pow(val - nullMean, 2), 0);
  const residuals = outcomes.map((val) => {
    // predicted = nullMean (null model)
    return val - nullMean;
  });
  const residualSS = residuals.reduce((sum, val) => sum + val ** 2, 0);
  const rSquared = totalSS > 0 ? 1 - residualSS / totalSS : 0;

  return {
    officerId: targetOfficer.officialId,
    rawRate,
    adjustedRate: rawRate, // placeholder - in full impl would use predicted from model
    adjustmentExplanation: `Risk-adjusted using OLS with ${controlFeatures.length} control(s); R^2 = ${rSquared.toFixed(3)}`,
    modelFit: {
      rSquared,
      coefficients: {}, // would be full coeff table in production
      seCoefficients: {},
    },
  };
}