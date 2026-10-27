"""Jupyter Notebook Interface for Akashic Civics.

Provides IPython magics, rich display hooks, and notebook generation utilities
for interactive disparity analysis in Jupyter notebooks.
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

try:
    from IPython.core.magic import Magics, magics_class, cell_magic, line_magic
    from IPython.core.getipython import get_ipython
    from IPython.display import display, HTML, Markdown, JSON as IPyJSON
    from IPython import InteractiveShell
    IPYTHON_AVAILABLE = True
except ImportError:
    IPYTHON_AVAILABLE = False
    # Dummy classes for type hints when IPython not installed
    Magics = None
    magics_class = None
    cell_magic = None
    line_magic = None
    InteractiveShell = None


from . import DisparityAnalyzer


if IPYTHON_AVAILABLE:

    @magics_class
    class AkashicMagics(Magics):
        """IPython magics for Akashic Civics analysis."""

        def __init__(self, shell: Optional['InteractiveShell'] = None, cli_path: Optional[str] = None):
            super().__init__(shell)
            self.analyzer = DisparityAnalyzer(cli_path)

        @cell_magic
        def akashic(self, line: str, cell: str) -> Any:
            """Run Akashic Civics analysis from a cell.

            Usage:
                %%akashic [analysis_type] [--output VAR]

                {
                    "cases": [...],
                    "predictors": [...]
                }

            Analysis types: describe, ztest, disconfirm, ols, causal
            """
            args = line.strip().split() if line.strip() else []
            analysis_type = args[0] if args else 'describe'
            output_var = None

            if '--output' in args:
                idx = args.index('--output')
                if idx + 1 < len(args):
                    output_var = args[idx + 1]

            try:
                data = json.loads(cell)
            except json.JSONDecodeError:
                return self.shell._show_error("Invalid JSON in cell body")

            result = self.analyzer._run_analysis(analysis_type, data)

            if output_var:
                self.shell.user_ns[output_var] = result

            return display_results(result)

        @line_magic
        def akashic_init(self, line: str) -> None:
            """Initialize Akashic Civics in the notebook.

            Usage:
                %akashic_init [cli_path]
            """
            cli_path = line.strip() or None
            self.analyzer = DisparityAnalyzer(cli_path)
            if IPYTHON_AVAILABLE:
                display(HTML('<div style="color: green;">✓ Akashic Civics initialized</div>'))
            else:
                print("✓ Akashic Civics initialized")

else:
    class AkashicMagics:
        """Stub when IPython is not installed."""

        def __init__(self, *args, **kwargs):
            raise ImportError(
                "IPython is required for Jupyter notebook integration. "
                "Install with: pip install ipython jupyter"
            )


def load_ipython_extension(ipython: 'InteractiveShell', cli_path: Optional[str] = None) -> None:
    """Load the Akashic Civics IPython extension.
    
    Usage in notebook:
        %load_ext akashic_civics.jupyter
        
    Or with custom CLI path:
        %load_ext akashic_civics.jupyter
        %akashic_init /path/to/akashic
    """
    if not IPYTHON_AVAILABLE:
        print("IPython not available. Jupyter extension cannot be loaded.")
        return
    
    ipython.register_magics(AkashicMagics)
    magics = AkashicMagics(ipython, cli_path)
    ipython.magics_manager.register(magics)
    
    # Also make analyzer available in namespace
    ipython.user_ns['akashic'] = magics.analyzer


def display_results(result: Dict[str, Any]) -> Any:
    """Display analysis results with rich formatting."""
    if not IPYTHON_AVAILABLE:
        print(json.dumps(result, indent=2))
        return result
    
    if 'error' in result:
        return display(HTML(f'<div style="color: red;">Error: {result["error"]}</div>'))
    
    if 'pipeline_id' in result:
        return display_pipeline_result(result)
    elif 'disconfirmation' in str(result).lower():
        return display_disconfirmation_result(result)
    elif 'coefficients' in result:
        return display_regression_result(result)
    else:
        return display_generic_result(result)


def display_pipeline_result(result: Dict[str, Any]) -> Any:
    """Display full pipeline analysis results."""
    from IPython.display import display, HTML
    
    html = f"""
    <div style="font-family: monospace; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        <h3>📊 Akashic Civics Pipeline Result</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 4px;"><b>Pipeline ID</b></td><td>{result.get('pipeline_id', 'N/A')}</td></tr>
            <tr><td style="padding: 4px;"><b>Snapshot ID</b></td><td>{result.get('snapshot_id', 'N/A')}</td></tr>
            <tr><td style="padding: 4px;"><b>Case Count</b></td><td>{result.get('case_count', 0)}</td></tr>
            <tr><td style="padding: 4px;"><b>Conviction Rate</b></td><td>{result.get('conviction_rate', 0):.3f}</td></tr>
            <tr><td style="padding: 4px;"><b>Data Quality Score</b></td><td>{result.get('data_quality_score', 0):.3f}</td></tr>
            <tr><td style="padding: 4px;"><b>Disconfirmation Passed</b></td><td>{'✅' if result.get('disconfirmation_passed') else '❌'}</td></tr>
        </table>
        <details>
            <summary>📋 Conclusions</summary>
            <ul>
    """
    
    for conclusion in result.get('conclusions', []):
        html += f"<li>{conclusion}</li>"
    
    html += """
            </ul>
        </details>
    </div>
    """
    
    display(HTML(html))
    
    # Also show analysis results if available
    if 'analysis_results' in result:
        display_generic_result(result['analysis_results'])


def display_disconfirmation_result(result: Dict[str, Any]) -> Any:
    """Display disconfirmation test results."""
    from IPython.display import display, HTML
    
    score = result.get('aggregated_score', 0)
    passed = result.get('passed', [])
    total = result.get('total', [])
    
    color = 'green' if score > 0.7 else 'orange' if score > 0.4 else 'red'
    
    html = f"""
    <div style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        <h3>🔬 Adaptive Disconfirmation Results</h3>
        <p><b>Aggregated Score:</b> <span style="color: {color}; font-weight: bold;">{score:.3f}</span></p>
        <p><b>Tests Passed:</b> {len(passed)} / {len(total)}</p>
        <details>
            <summary>📋 Test Details</summary>
            <ul>
    """
    
    for test in total:
        status = "✅" if test in passed else "❌"
        html += f"<li>{status} {test}</li>"
    
    html += "</ul></details></div>"
    display(HTML(html))


def display_regression_result(result: Dict[str, Any]) -> Any:
    """Display regression analysis results."""
    from IPython.display import display, HTML
    
    coeffs = result.get('coefficients', {})
    r2 = result.get('r_squared', 0)
    intercept = result.get('intercept', 0)
    
    html = f"""
    <div style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        <h3>📈 Regression Results</h3>
        <p><b>R²:</b> {r2:.4f}</p>
        <p><b>Intercept:</b> {intercept:.4f}</p>
        <table style="border-collapse: collapse; width: 100%;">
            <thead>
                <tr style="background: #f0f0f0;">
                    <th style="padding: 8px; border: 1px solid #ddd;">Predictor</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Coefficient</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">P-value</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">95% CI</th>
                </tr>
            </thead>
            <tbody>
    """
    
    p_values = result.get('p_values', {})
    cis = result.get('confidence_intervals', {})
    
    for var, coeff in coeffs.items():
        p = p_values.get(var, 'N/A')
        ci = cis.get(var, 'N/A')
        if isinstance(ci, (list, tuple)) and len(ci) == 2:
            ci_str = f"[{ci[0]:.4f}, {ci[1]:.4f}]"
        else:
            ci_str = str(ci)
        
        html += f"""
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">{var}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{coeff:.4f}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{p:.4f}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{ci_str}</td>
                </tr>
        """
    
    html += "</tbody></table></div>"
    display(HTML(html))


def display_generic_result(result: Dict[str, Any]) -> Any:
    """Display generic results as JSON."""
    if IPYTHON_AVAILABLE:
        return display(IPyJSON(result))
    else:
        print(json.dumps(result, indent=2))
        return result


class NotebookGenerator:
    """Generate analysis notebooks from templates."""
    
    TEMPLATES = {
        'disparity_analysis': {
            'title': 'Disparity Analysis Notebook',
            'cells': [
                {
                    'cell_type': 'markdown',
                    'source': '# Disparity Analysis: {{jurisdiction}}\n\n'
                              'This notebook performs a disparity analysis for {{jurisdiction}} '
                              'using Akashic Civics.'
                },
                {
                    'cell_type': 'code',
                    'source': '%load_ext akashic_civics.jupyter\n'
                              '%akashic_init\n\n'
                              'from akashic_civics import DisparityAnalyzer\n'
                              'analyzer = DisparityAnalyzer()'
                },
                {
                    'cell_type': 'code',
                    'source': '# Load your data here\n'
                              'cases = []  # Replace with your data\n'
                              'print(f"Loaded {len(cases)} cases")'
                },
                {
                    'cell_type': 'code',
                    'source': '# Run descriptive statistics\n'
                              'stats = analyzer.compute_descriptive_stats(cases)\n'
                              'stats'
                },
                {
                    'cell_type': 'code',
                    'source': '# Run disconfirmation battery\n'
                              'disconfirm = analyzer.run_disconfirmation(cases)\n'
                              'disconfirm'
                },
            ]
        },
        'sentencing_analysis': {
            'title': 'Sentencing Analysis Notebook',
            'cells': [
                {
                    'cell_type': 'markdown',
                    'source': '# Sentencing Analysis: {{jurisdiction}}\n\n'
                              'Compare sentencing patterns across groups.'
                },
                {
                    'cell_type': 'code',
                    'source': '%load_ext akashic_civics.jupyter\n'
                              '%akashic_init\n\n'
                              'from akashic_civics import DisparityAnalyzer\n'
                              'analyzer = DisparityAnalyzer()'
                },
                {
                    'cell_type': 'code',
                    'source': '# Load sentencing data\n'
                              'cases = []  # Replace with your data\n'
                              'print(f"Loaded {len(cases)} cases")'
                },
                {
                    'cell_type': 'code',
                    'source': '# Run OLS regression with covariates\n'
                              'predictors = ["offense_severity", "prior_record", "race_ethnicity"]\n'
                              'ols = analyzer.run_ols_regression(cases, predictors)\n'
                              'ols'
                },
            ]
        },
        'trend_monitoring': {
            'title': 'Trend Monitoring Notebook',
            'cells': [
                {
                    'cell_type': 'markdown',
                    'source': '# Trend Monitoring: {{jurisdiction}}\n\n'
                              'Track changes in metrics over time.'
                },
                {
                    'cell_type': 'code',
                    'source': '%load_ext akashic_civics.jupyter\n'
                              '%akashic_init\n\n'
                              'from akashic_civics import DisparityAnalyzer\n'
                              'analyzer = DisparityAnalyzer()'
                },
                {
                    'cell_type': 'code',
                    'source': '# Load time-series data\n'
                              'cases = []  # Replace with your data\n'
                              'print(f"Loaded {len(cases)} cases")'
                },
                {
                    'cell_type': 'code',
                    'source': '# Run trend analysis\n'
                              'stats = analyzer.compute_descriptive_stats(cases)\n'
                              'stats'
                },
            ]
        },
    }
    
    @classmethod
    def create_notebook(cls, template_name: str, jurisdiction: str = 'TX-001', 
                        output_path: Optional[str] = None) -> Dict[str, Any]:
        """Create a Jupyter notebook from a template.
        
        Args:
            template_name: One of 'disparity_analysis', 'sentencing_analysis', 'trend_monitoring'
            jurisdiction: Jurisdiction identifier (e.g., 'TX-001')
            output_path: Optional path to save the notebook (.ipynb)
            
        Returns:
            Notebook dictionary (nbformat v4)
        """
        if template_name not in cls.TEMPLATES:
            raise ValueError(f"Unknown template: {template_name}. "
                           f"Available: {list(cls.TEMPLATES.keys())}")
        
        template = cls.TEMPLATES[template_name]
        
        notebook = {
            'nbformat': 4,
            'nbformat_minor': 4,
            'metadata': {
                'kernelspec': {
                    'display_name': 'Python 3',
                    'language': 'python',
                    'name': 'python3'
                },
                'language_info': {
                    'name': 'python',
                    'version': sys.version.split()[0]
                }
            },
            'cells': []
        }
        
        for cell in template['cells']:
            source = cell['source'].replace('{{jurisdiction}}', jurisdiction)
            notebook['cells'].append({
                'cell_type': cell['cell_type'],
                'source': source,
                'metadata': {},
                'outputs': [],
                'execution_count': None
            })
        
        if output_path:
            with open(output_path, 'w') as f:
                json.dump(notebook, f, indent=2)
        
        return notebook
    
    @classmethod
    def list_templates(cls) -> List[str]:
        """List available notebook templates."""
        return list(cls.TEMPLATES.keys())


def create_comparison_notebook(
    jurisdictions: List[str],
    output_path: Optional[str] = None
) -> Dict[str, Any]:
    """Create a notebook comparing multiple jurisdictions."""
    notebook = {
        'nbformat': 4,
        'nbformat_minor': 4,
        'metadata': {
            'kernelspec': {
                'display_name': 'Python 3',
                'language': 'python',
                'name': 'python3'
            },
            'language_info': {
                'name': 'python',
                'version': sys.version.split()[0]
            }
        },
        'cells': [
            {
                'cell_type': 'markdown',
                'source': f'# Multi-Jurisdiction Comparison\n\n'
                          f'Comparing: {", ".join(jurisdictions)}'
            },
            {
                'cell_type': 'code',
                'source': '%load_ext akashic_civics.jupyter\n'
                          '%akashic_init\n\n'
                          'from akashic_civics import DisparityAnalyzer\n'
                          'analyzer = DisparityAnalyzer()\n\n'
                          'results = {}'
            },
        ]
    }
    
    for j in jurisdictions:
        notebook['cells'].append({
            'cell_type': 'code',
            'source': f'# Analysis for {j}\n'
                      f'cases_{j.replace("-", "_")} = []  # Load data for {j}\n'
                      f'results["{j}"] = analyzer.compute_descriptive_stats(cases_{j.replace("-", "_")})\n'
                      f'results["{j}"]'
        })
    
    notebook['cells'].append({
        'cell_type': 'code',
        'source': '# Compare results\n'
                  'import pandas as pd\n'
                  'df = pd.DataFrame({k: v for k, v in results.items() if isinstance(v, dict)})\n'
                  'df'
    })
    
    if output_path:
        with open(output_path, 'w') as f:
            json.dump(notebook, f, indent=2)
    
    return notebook


__all__ = [
    'AkashicMagics',
    'load_ipython_extension',
    'display_results',
    'NotebookGenerator',
    'create_comparison_notebook',
]