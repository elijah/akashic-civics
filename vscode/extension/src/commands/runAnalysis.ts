import * as vscode from 'vscode';

export function runAnalysisCommand() {
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Akashic Civics",
    cancellable: true
  }, async (progress, token) => {
    progress.report({ message: "Initializing analysis..." });
    try {
      // Try to find a cases.jsonl in the workspace root
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showInformationMessage('No workspace folder open');
        return;
      }

      const baseUri = workspaceFolders.length > 1 ? workspaceFolders[1].uri : workspaceFolders[0].uri;
      const casesPath = vscode.Uri.joinPath(baseUri, 'cases.jsonl');

      let exists = false;
      try {
        await vscode.workspace.fs.stat(casesPath);
        exists = true;
      } catch {
        exists = false;
      }

      if (exists) {
        progress.report({ message: "Running analysis on " + casesPath.fsPath });
        // Placeholder for actual analysis - would use akashic-civics API
        vscode.window.showInformationMessage(`Analysis ready: ${casesPath.fsPath}`);
      } else {
        progress.report({ message: "No cases.jsonl found at workspace root" });
        vscode.window.showInformationMessage('No cases.jsonl found in workspace. Create one first.');
      }
    } catch (err) {
      progress.report({ message: "Analysis failed" });
      vscode.window.showErrorMessage(`Analysis error: ${err instanceof Error ? err.message : err}`);
    }
  });
}

export function loadCasesCommand() {
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Load Case Dataset",
    cancellable: true
  }, async (progress, token) => {
    progress.report({ message: "Select cases.jsonl file" });
    const uri = await vscode.window.showOpenDialog({
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'JSONL Files': ['jsonl'],
        'All Files': ['*']
      }
    });

    if (!uri || uri.length === 0) {
      progress.report({ message: "Load cancelled" });
      return;
    }

    const fileUri = uri[0];
    progress.report({ message: "Loading cases from " + fileUri.fsPath });

    try {
      const content = await vscode.workspace.fs.readFile(fileUri);
      const text = new TextDecoder().decode(content);
      const lines = text.trim().split('\n');

      vscode.window.showInformationMessage(`Loaded ${lines.length} cases from ${fileUri.fsPath}`);
    } catch (err) {
      progress.report({ message: "Load failed" });
      vscode.window.showErrorMessage(`Error loading cases: ${err instanceof Error ? err.message : err}`);
    }
  });
}