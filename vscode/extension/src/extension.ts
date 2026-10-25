import * as vscode from 'vscode';
import { runAnalysisCommand } from './commands/runAnalysis';
import { loadCasesCommand } from './commands/loadCases';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('akashic-civics.runAnalysis', runAnalysisCommand),
    vscode.commands.registerCommand('akashic-civics.loadCases', loadCasesCommand)
  );
}

export function deactivate() {}