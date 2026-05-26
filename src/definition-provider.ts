import * as vscode from 'vscode';
import { WorkspaceSymbolIndexer, SymbolInfo } from './symbol-indexer';
import { TypeResolver } from './completion-provider';

export class D7BasicDefinitionProvider implements vscode.DefinitionProvider {
  private indexer = WorkspaceSymbolIndexer.getInstance();

  public provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
    const range = document.getWordRangeAtPosition(position);
    if (!range) return undefined;

    const word = document.getText(range);
    const lineText = document.lineAt(position.line).text;
    const textBeforeCursor = lineText.substring(0, range.start.character).trim();

    let targetSymbol: SymbolInfo | undefined;

    // Case A: Cursor is on a member call (e.g., `obj.Member` or `me.Member`)
    if (textBeforeCursor.endsWith('.')) {
      const dotIndex = lineText.lastIndexOf('.', range.start.character);
      if (dotIndex !== -1) {
        const prefix = lineText.substring(0, dotIndex).trim();
        const lastWordMatch = prefix.match(/([a-zA-Z0-9_]+)$/);
        
        if (lastWordMatch) {
          const triggerWord = lastWordMatch[1];
          const triggerLower = triggerWord.toLowerCase();

          if (triggerLower === 'me' || triggerLower === 'mybase') {
            // Find current class context
            const fileSyms = this.indexer.getFileSymbols(document.uri.toString());
            if (fileSyms) {
              const currentClass = fileSyms.symbols.find(s => 
                s.kind === 'class' && 
                position.line >= s.range.startLine && 
                (s.range.endLine === undefined || position.line <= s.range.endLine)
              );
              if (currentClass) {
                // Look for member in current class or parent classes
                targetSymbol = this.indexer.findClassMember(currentClass.name, word);
              }
            }
          } else {
            // Resolve variable type or namespace
            let typeName = TypeResolver.getVariableType(triggerWord, document, position, this.indexer);
            if (!typeName) {
              // Try to treat triggerWord as class or namespace itself
              const staticSymbol = this.indexer.findSymbolByName(triggerWord, document.uri.toString());
              if (staticSymbol) {
                typeName = staticSymbol.name;
              }
            }

            if (typeName) {
              targetSymbol = this.indexer.findClassMember(typeName, word);
            }
          }
        }
      }
    }

    // Case B: Global/Standalone Reference (e.g. Type, ClassName, namespace, helper function)
    if (!targetSymbol) {
      targetSymbol = this.indexer.findSymbolByName(word, document.uri.toString());
    }

    if (targetSymbol && targetSymbol.fileUri && !targetSymbol.fileUri.startsWith('system://')) {
      const targetUri = vscode.Uri.parse(targetSymbol.fileUri);
      const targetRange = new vscode.Range(
        targetSymbol.range.startLine,
        targetSymbol.range.startChar,
        targetSymbol.range.startLine,
        targetSymbol.range.endChar || 100
      );
      return new vscode.Location(targetUri, targetRange);
    }

    return undefined;
  }
}
