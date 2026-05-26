import * as vscode from 'vscode';

export class D7BasicCodeActionProvider implements vscode.CodeActionProvider {
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
    const actions: vscode.CodeAction[] = [];
    
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.code === 'missing-import') {
        const match = diagnostic.message.match(/pertence ao módulo "([a-zA-Z0-9_.]+)"/);
        if (match) {
          const namespaceToImport = match[1];
          const action = new vscode.CodeAction(
            `Importar "${namespaceToImport}"`,
            vscode.CodeActionKind.QuickFix
          );
          action.diagnostics = [diagnostic];
          action.isPreferred = true;
          
          const edit = new vscode.WorkspaceEdit();
          
          let insertLine = 0;
          for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text.trim();
            if (lineText.toLowerCase().startsWith('imports ')) {
              insertLine = i + 1;
            }
          }
          
          edit.insert(document.uri, new vscode.Position(insertLine, 0), `Imports ${namespaceToImport}\r\n`);
          action.edit = edit;
          actions.push(action);
        }
      }
    }
    
    return actions;
  }
}
