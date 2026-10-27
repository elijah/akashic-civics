/**
 * Dashboard Frontend
 * Interactive disparity analysis dashboard for Akashic Civics
 */

// State
let currentData = [];
let currentAnalysis = null;

// DOM Elements
const elements = {
  fileInput: document.getElementById('fileInput'),
  uploadBtn: document.getElementById('uploadBtn'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  jurisdictionSelect: document.getElementById('jurisdictionSelect'),
  groupSelect: document.getElementById('groupSelect'),
  metricSelect: document.getElementById('metricSelect'),
  vizGrid: document.getElementById('vizGrid'),
  kpiGrid: document.getElementById('kpiGrid'),
  loading: document.getElementById('loading'),
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
  setupEventListeners();
  renderEmptyState();
}

function setupEventListeners() {
  elements.uploadBtn?.addEventListener('click', () => elements.fileInput?.click());
  elements.fileInput?.addEventListener('change', handleFileUpload);
  elements.analyzeBtn?.addEventListener('click', runAnalysis);
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      // Parse JSONL or JSON
      if (file.name.endsWith('.jsonl') || file.name.endsWith('.ndjson')) {
        currentData = text.trim().split('\n').map(line => JSON.parse(line));
      } else {
        currentData = JSON.parse(text);
        if (!Array.isArray(currentData)) {
          currentData = [currentData];
        }
      }
      updateUIAfterLoad();
    } catch (err) {
      alert('Error parsing file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function updateUIAfterLoad() {
  // Update KPIs
  if (elements.kpiGrid) {
    elements.kpiGrid.innerHTML = `
      <div class="kpi-card"><div class="value">${currentData.length}</div><div class="label">Total Cases</div></div>
      <div class="kpi-card"><div class="value">${currentData.filter(c => c.conviction).length}</div><div class="label">Convictions</div></div>
      <div class="kpi-card"><div class="value">${((currentData.filter(c => c.conviction).length / currentData.length) * 100).toFixed(1)}%</div><div class="label">Conviction Rate</div></div>
    `;
  }
  elements.analyzeBtn?.removeAttribute('disabled');
  renderEmptyState();
}

async function runAnalysis() {
  if (!currentData.length) return;

  elements.loading?.classList.remove('hidden');

  // Simulate analysis
  setTimeout(() => {
    currentAnalysis = generateAnalysis(currentData);
    renderVisualizations(currentAnalysis);
    elements.loading?.classList.add('hidden');
  }, 1000);
}

function generateAnalysis(data) {
  // Group by race_ethnicity
  const groups = {};
  data.forEach(d => {
    const group = d.race_ethnicity || 'Unknown';
    if (!groups[group]) groups[group] = { convictions: 0, total: 0, sentences: [] };
    groups[group].total++;
    if (d.conviction) groups[group].convictions++;
    if (d.sentence_months) groups[group].sentences.push(d.sentence_months);
  });

  const results = Object.entries(groups).map(([group, stats]) => ({
    group,
    total: stats.total,
    convictions: stats.convictions,
    convictionRate: stats.total > 0 ? stats.convictions / stats.total : 0,
    avgSentence: stats.sentences.length ? stats.sentences.reduce((a,b)=>a+b,0) / stats.sentences.length : 0,
  }));

  return { results, rawData: data };
}

function renderVisualizations(analysis) {
  if (!elements.vizGrid) return;

  const { results } = analysis;
  const disparityRatio = Math.max(...results.map(r => r.convictionRate)) / 
                         Math.min(...results.filter(r => r.convictionRate > 0).map(r => r.convictionRate)) || 1;

  elements.vizGrid.innerHTML = `
    <div class="viz-card">
      <div class="viz-header">
        <h3>Conviction Rates by Group</h3>
        <div class="description">Bar chart comparing conviction rates across demographic groups</div>
      </div>
      <div class="viz-body">
        <div class="viz-placeholder">
          <div>Bar Chart: ${results.length} groups</div>
          ${results.map(r => `<div>${r.group}: ${(r.convictionRate * 100).toFixed(1)}%</div>`).join('')}
        </div>
      </div>
    </div>
    <div class="viz-card">
      <div class="viz-header">
        <h3>Disparity Ratio</h3>
        <div class="description">Ratio of highest to lowest conviction rate</div>
      </div>
      <div class="viz-body">
        <div class="viz-placeholder">
          <div style="font-size: 3rem; font-weight: 600; color: var(--accent);">${disparityRatio.toFixed(2)}x</div>
          <div>Disparity Ratio</div>
        </div>
      </div>
    </div>
    <div class="viz-card">
      <div class="viz-header">
        <h3>Average Sentence Length</h3>
        <div class="description">Mean sentence by demographic group (months)</div>
      </div>
      <div class="viz-body">
        <div class="viz-placeholder">
          ${results.map(r => `<div>${r.group}: ${r.avgSentence.toFixed(1)} months</div>`).join('')}
        </div>
      </div>
    </div>
    <div class="viz-card">
      <div class="viz-header">
        <h3>Case Volume</h3>
        <div class="description">Number of cases per demographic group</div>
      </div>
      <div class="viz-body">
        <div class="viz-placeholder">
          ${results.map(r => `<div>${r.group}: ${r.total} cases</div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderEmptyState() {
  if (!elements.vizGrid) return;
  if (!currentData.length) {
    elements.vizGrid.innerHTML = `
      <div class="viz-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
        <div style="color: var(--muted);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
          <p>Upload a JSON/JSONL file with case data to begin analysis</p>
        </div>
      </div>
    `;
    elements.analyzeBtn?.setAttribute('disabled', 'true');
  }
}