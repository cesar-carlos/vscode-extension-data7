import * as vscode from 'vscode';
import { WorkspaceSymbolIndexer, SymbolInfo } from './symbol-indexer';
import { SYSTEM_SYMBOLS } from './system-library';
import { TypeResolver } from './completion-provider';

export class D7BasicSignatureHelpProvider implements vscode.SignatureHelpProvider {
  private indexer = WorkspaceSymbolIndexer.getInstance();

  private static getSignatureHelpContext(
    lineText: string,
    characterIdx: number
  ): { name: string; dotPrefix?: string; activeParamIdx: number } | undefined {
    let parenCount = 0;
    let commaCount = 0;
    let inQuote = false;
    let wordEndIdx = -1;

    // Scan backward from characterIdx - 1
    for (let i = characterIdx - 1; i >= 0; i--) {
      const char = lineText[i];
      if (char === '"') {
        inQuote = !inQuote;
        continue;
      }
      if (inQuote) continue;

      if (char === ')') {
        parenCount++;
      } else if (char === '(') {
        if (parenCount > 0) {
          parenCount--;
        } else {
          wordEndIdx = i;
          break;
        }
      } else if (char === ',' && parenCount === 0) {
        commaCount++;
      }
    }

    if (wordEndIdx === -1) return undefined;

    // Extract the function name word preceding the '('
    let scanIdx = wordEndIdx - 1;
    while (scanIdx >= 0 && /\s/.test(lineText[scanIdx])) {
      scanIdx--;
    }

    const idMatch = lineText.substring(0, scanIdx + 1).match(/([a-zA-Z0-9_]+)$/);
    if (!idMatch) return undefined;
    
    const funcName = idMatch[1];
    let dotPrefix: string | undefined;

    const prefixStart = idMatch.index || 0;
    if (prefixStart > 0 && lineText[prefixStart - 1] === '.') {
      const prefixMatch = lineText.substring(0, prefixStart - 1).match(/([a-zA-Z0-9_]+)$/);
      if (prefixMatch) {
        dotPrefix = prefixMatch[1];
      }
    }

    return {
      name: funcName,
      dotPrefix,
      activeParamIdx: commaCount
    };
  }

  public provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.SignatureHelpContext
  ): vscode.ProviderResult<vscode.SignatureHelp> {
    const lineText = document.lineAt(position.line).text;
    const sigCtx = D7BasicSignatureHelpProvider.getSignatureHelpContext(lineText, position.character);
    if (!sigCtx) return undefined;

    let targetSymbol: SymbolInfo | undefined;

    if (sigCtx.dotPrefix) {
      const dotPrefixLower = sigCtx.dotPrefix.toLowerCase();
      if (dotPrefixLower === 'me' || dotPrefixLower === 'mybase') {
        const fileSyms = this.indexer.getFileSymbols(document.uri.toString());
        if (fileSyms) {
          const currentClass = fileSyms.symbols.find(s => 
            s.kind === 'class' && 
            position.line >= s.range.startLine && 
            (s.range.endLine === undefined || position.line <= s.range.endLine)
          );
          if (currentClass) {
            targetSymbol = this.findClassMember(currentClass.name, sigCtx.name);
          }
        }
      } else {
        let typeName = TypeResolver.getVariableType(sigCtx.dotPrefix, document, position, this.indexer);
        if (!typeName) {
          const staticSymbol = this.indexer.findSymbolByName(sigCtx.dotPrefix, document.uri.toString()) ||
                               SYSTEM_SYMBOLS.find(s => s.name.toLowerCase() === dotPrefixLower && (s.kind === 'namespace' || s.kind === 'class'));
          if (staticSymbol) {
            typeName = staticSymbol.name;
          }
        }
        if (typeName) {
          targetSymbol = this.findClassMember(typeName, sigCtx.name);
        }
      }
    } else {
      targetSymbol = this.indexer.findSymbolByName(sigCtx.name, document.uri.toString()) || 
                     SYSTEM_SYMBOLS.find(s => s.name.toLowerCase() === sigCtx.name.toLowerCase() && (s.kind === 'method' || s.kind === 'declare_function' || s.kind === 'declare_sub'));
    }

    if (targetSymbol && (targetSymbol.kind === 'method' || targetSymbol.kind === 'declare_function' || targetSymbol.kind === 'declare_sub' || targetSymbol.kind === 'delegate')) {
      const sigHelp = new vscode.SignatureHelp();
      
      const paramList = targetSymbol.parameters?.map(p => {
        let pStr = '';
        if (p.isOptional) pStr += 'Optional ';
        if (p.isByRef) pStr += 'ByRef ';
        pStr += `${p.name} As ${p.type}`;
        if (p.defaultValue) pStr += ` = ${p.defaultValue}`;
        return pStr;
      }).join(', ') || '';

      const isSub = targetSymbol.type === 'Void';
      const label = `${targetSymbol.kind === 'delegate' ? 'Delegate ' : ''}${isSub ? 'Sub' : 'Function'} ${targetSymbol.name}(${paramList})${!isSub ? ` As ${targetSymbol.type}` : ''}`;
      
      const sigInfo = new vscode.SignatureInformation(label, targetSymbol.description || undefined);
      sigInfo.parameters = targetSymbol.parameters?.map(p => {
        let doc = p.isOptional ? 'Opcional. ' : 'Obrigatório. ';
        if (p.isByRef) doc += 'Passado por referência (ByRef). ';
        if (p.defaultValue) doc += `Valor padrão: ${p.defaultValue}`;
        return new vscode.ParameterInformation(`${p.name} As ${p.type}`, doc);
      }) || [];

      sigHelp.signatures = [sigInfo];
      sigHelp.activeSignature = 0;
      sigHelp.activeParameter = Math.min(sigCtx.activeParamIdx, sigInfo.parameters.length - 1);
      
      return sigHelp;
    }

    return undefined;
  }

  private findClassMember(className: string, memberName: string): SymbolInfo | undefined {
    const memberLower = memberName.toLowerCase();
    
    let match = SYSTEM_SYMBOLS.find(s => 
      s.containerName?.toLowerCase() === className.toLowerCase() && 
      s.name.toLowerCase() === memberLower
    );
    if (match) return match;

    match = this.indexer.findClassMember(className, memberName);
    if (match) return match;

    let currentClass = this.indexer.findSymbolByName(className) || 
                       SYSTEM_SYMBOLS.find(s => s.name.toLowerCase() === className.toLowerCase() && s.kind === 'class');
                       
    const visited = new Set<string>();
    while (currentClass && currentClass.inheritsFrom && !visited.has(currentClass.name.toLowerCase())) {
      visited.add(currentClass.name.toLowerCase());
      const parentName = currentClass.inheritsFrom;

      match = SYSTEM_SYMBOLS.find(s => 
        s.containerName?.toLowerCase() === parentName.toLowerCase() && 
        s.name.toLowerCase() === memberLower
      );
      if (match) return match;

      match = this.indexer.findClassMember(parentName, memberName);
      if (match) return match;

      currentClass = this.indexer.findSymbolByName(parentName) || 
                     SYSTEM_SYMBOLS.find(s => s.name.toLowerCase() === parentName.toLowerCase() && s.kind === 'class');
    }

    return undefined;
  }
}
