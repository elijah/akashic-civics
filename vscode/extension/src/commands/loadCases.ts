import * as vscode from 'vscode';

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