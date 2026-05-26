import * as vscode from 'vscode';
import { WorkspaceSymbolIndexer, SymbolInfo } from './symbol-indexer';
import { SYSTEM_SYMBOLS } from './system-library';
import { TypeResolver } from './completion-provider';
import { DependencyScanner } from './dependency-scanner';

export class DiagnosticsLinter {
  private static resolveClassName(className: string): string {
    const lastDotIdx = className.lastIndexOf('.');
    if (lastDotIdx !== -1) {
      return className.substring(lastDotIdx + 1);
    }
    return className;
  }

  private static checkHasClassMember(className: string, memberName: string, indexer: WorkspaceSymbolIndexer): boolean {
    const memberLower = memberName.toLowerCase();
    const shortClassName = this.resolveClassName(className);
    
    // 1. Check system library
    let match = SYSTEM_SYMBOLS.some(s => 
      s.containerName?.toLowerCase() === shortClassName.toLowerCase() && 
      s.name.toLowerCase() === memberLower
    );
    if (match) return true;

    // 2. Check workspace
    const allSymbols = indexer.getAllSymbols();
    match = allSymbols.some(s => 
      s.containerName?.toLowerCase() === shortClassName.toLowerCase() && 
      s.name.toLowerCase() === memberLower
    );
    if (match) return true;

    // 3. Check parent classes
    let currentClass = indexer.findSymbolByName(shortClassName) || 
                       SYSTEM_SYMBOLS.find(s => s.name.toLowerCase() === shortClassName.toLowerCase() && s.kind === 'class');
    const visited = new Set<string>();
    while (currentClass && !visited.has(currentClass.name.toLowerCase())) {
      visited.add(currentClass.name.toLowerCase());
      
      // Fall back to TObject if there is no explicit inheritsFrom parent (except for TObject itself)
      const parentName = currentClass.inheritsFrom || 'TObject';
      const shortParentName = this.resolveClassName(parentName);
      if (shortParentName.toLowerCase() === 'tobject' && currentClass.name.toLowerCase() === 'tobject') {
        break;
      }

      if (SYSTEM_SYMBOLS.some(s => s.containerName?.toLowerCase() === shortParentName.toLowerCase() && s.name.toLowerCase() === memberLower)) {
        return true;
      }
      if (allSymbols.some(s => s.containerName?.toLowerCase() === shortParentName.toLowerCase() && s.name.toLowerCase() === memberLower)) {
        return true;
      }

      currentClass = indexer.findSymbolByName(shortParentName) || 
                     SYSTEM_SYMBOLS.find(s => s.name.toLowerCase() === shortParentName.toLowerCase() && s.kind === 'class');
    }

    return false;
  }

  private static isKnownType(className: string, indexer: WorkspaceSymbolIndexer): boolean {
    const lowerName = className.toLowerCase();
    if (lowerName === 'variant' || lowerName === 'tobject' || lowerName === 'void') {
      return true;
    }

    // Parse className for dot notation (e.g. Forms.TWinControl)
    let nameToCheck = className;
    let containerToCheck: string | undefined;
    const lastDotIdx = className.lastIndexOf('.');
    if (lastDotIdx !== -1) {
      nameToCheck = className.substring(lastDotIdx + 1);
      containerToCheck = className.substring(0, lastDotIdx);
    }

    // Check if system symbols contain this name as class or structure
    const inSystem = SYSTEM_SYMBOLS.some(s => {
      if (s.kind !== 'class' && s.kind !== 'structure') return false;
      if (s.name.toLowerCase() !== nameToCheck.toLowerCase()) return false;
      if (containerToCheck) {
        return s.containerName?.toLowerCase() === containerToCheck.toLowerCase();
      }
      return true;
    });
    if (inSystem) return true;

    // Check workspace using findSymbolByName to resolve imports/etc.
    const symbol = indexer.findSymbolByName(nameToCheck);
    if (symbol && (symbol.kind === 'class' || symbol.kind === 'structure')) {
      if (containerToCheck) {
        if (symbol.containerName?.toLowerCase() === containerToCheck.toLowerCase()) {
          return true;
        }
      } else {
        return true;
      }
    }

    const symbolDirect = indexer.findSymbolByName(className);
    if (symbolDirect && (symbolDirect.kind === 'class' || symbolDirect.kind === 'structure')) {
      return true;
    }

    return false;
  }

  private static validateTypeReference(
    typeName: string,
    lineIdx: number,
    startChar: number,
    document: vscode.TextDocument,
    indexer: WorkspaceSymbolIndexer,
    diagnostics: vscode.Diagnostic[]
  ) {
    const typeLower = typeName.toLowerCase();
    
    // 1. Check if primitive
    const primitives = new Set([
      'string', 'integer', 'double', 'boolean', 'tdatetime', 'date', 'variant', 'tobject',
      'void', 'single', 'char', 'byte', 'long', 'decimal', 'short'
    ]);
    if (primitives.has(typeLower)) {
      return;
    }

    // 2. Handle dot prefix to check qualifiers
    const dotIndex = typeName.indexOf('.');
    if (dotIndex !== -1) {
      // Qualified type (e.g. Forms.TWinControl). Qualified types are resolved directly, no Imports statement needed.
      return;
    }

    // 3. Resolve if the class/structure/type exists in workspace symbols or SYSTEM_SYMBOLS
    const allSymbols = indexer.getAllSymbols();
    const fileSyms = indexer.getFileSymbols(document.uri.toString());
    const activeNamespace = fileSyms?.symbols.find(s => s.kind === 'namespace')?.name;

    // Search workspace symbols for this type name
    const workspaceMatches = allSymbols.filter(s =>
      s.name.toLowerCase() === typeLower &&
      (s.kind === 'class' || s.kind === 'structure' || s.kind === 'delegate' || s.kind === 'namespace')
    );

    // Search system symbols for this type name
    const systemMatches = SYSTEM_SYMBOLS.filter(s =>
      s.name.toLowerCase() === typeLower &&
      (s.kind === 'class' || s.kind === 'structure' || s.kind === 'delegate' || s.kind === 'namespace')
    );

    const allMatches = [...workspaceMatches, ...systemMatches];

    // If the type is unrecognized (i.e. not in workspace symbols nor system library),
    // ignore it to avoid false positives on unresolved external Delphi/VCL types.
    if (allMatches.length === 0) {
      return;
    }

    // Check if any match is valid (either has no namespace, belongs to active namespace, is imported, or is ignored/native)
    let isValid = false;
    let matchingNamespace: string | undefined;

    for (const sym of allMatches) {
      const ns = sym.containerName;
      if (!ns) {
        // Standalone symbol, no import needed
        isValid = true;
        break;
      }

      const nsLower = ns.toLowerCase();
      
      // If it's the active namespace
      if (activeNamespace && activeNamespace.toLowerCase() === nsLower) {
        isValid = true;
        break;
      }

      // If the namespace is in the file's imports
      if (fileSyms && fileSyms.imports.some(imp => imp.toLowerCase() === nsLower)) {
        isValid = true;
        break;
      }

      // NEW RULE: If the symbol is declared in Principal.bas, it's considered global/exempt
      if (sym.fileUri && /principal\.bas$/i.test(sym.fileUri)) {
        isValid = true;
        break;
      }

      // Keep track of the namespace we need to import
      matchingNamespace = ns;
    }

    if (!isValid && matchingNamespace) {
      const range = new vscode.Range(lineIdx, startChar, lineIdx, startChar + typeName.length);
      const diag = new vscode.Diagnostic(
        range,
        `O tipo "${typeName}" pertence ao módulo "${matchingNamespace}", que não foi importado neste arquivo.`,
        vscode.DiagnosticSeverity.Error
      );
      diag.code = 'missing-import';
      diagnostics.push(diag);
    }
  }

  public static runAdvancedDiagnostics(
    document: vscode.TextDocument,
    indexer: WorkspaceSymbolIndexer
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    const lines = text.split(/\r?\n/);

    // 1. Gather imports and check for unused imports
    const imports: { name: string; line: number; range: vscode.Range; referenced: boolean }[] = [];
    const importsRegex = /^\s*Imports\s+([a-zA-Z0-9_.]+)/i;
    
    lines.forEach((lineText, lineIdx) => {
      const cleanLine = DependencyScanner.stripComments(lineText);
      const match = cleanLine.match(importsRegex);
      if (match) {
        const name = match[1];
        const start = lineText.indexOf(name);
        imports.push({
          name,
          line: lineIdx,
          range: new vscode.Range(lineIdx, start, lineIdx, start + name.length),
          referenced: false
        });
      }
    });

    const allSymbols = indexer.getAllSymbols();
    
    // Check if the import name is used in the text
    imports.forEach(imp => {
      const nameLower = imp.name.toLowerCase();
      
      // Check if the import name is used as prefix: e.g. SomeNamespace.
      const usageRegex = new RegExp(`\\b${imp.name}\\b\\.`, 'i');
      if (usageRegex.test(text)) {
        imp.referenced = true;
        return;
      }
      // Also check if any symbol inside the imported namespace (classes, structures, delegates, methods, variables) is used in the document
      const symbolsInNamespace = [
        ...allSymbols,
        ...SYSTEM_SYMBOLS
      ].filter(s => s.containerName?.toLowerCase() === nameLower);

      for (const s of symbolsInNamespace) {
        const symbolUsageRegex = new RegExp(`\\b${s.name}\\b`, 'i');
        if (symbolUsageRegex.test(text)) {
          imp.referenced = true;
          break;
        }
      }
    });

    // Add warnings for unused imports
    imports.forEach(imp => {
      if (!imp.referenced) {
        const diag = new vscode.Diagnostic(
          imp.range,
          `Importação desnecessária ou não utilizada: "${imp.name}".`,
          vscode.DiagnosticSeverity.Warning
        );
        diag.code = 'unused-import';
        diagnostics.push(diag);
      }
    });

    // 2. Scan for member accesses: obj.Member or me.Member
    const memberAccessRegex = /\b([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\b/gi;
    lines.forEach((lineText, lineIdx) => {
      const cleanLine = DependencyScanner.stripComments(lineText);
      if (!cleanLine.trim() || cleanLine.toLowerCase().startsWith('imports ')) return;

      let match;
      while ((match = memberAccessRegex.exec(cleanLine)) !== null) {
        const objectName = match[1];
        const memberName = match[2];
        const objectLower = objectName.toLowerCase();

        // Reset lastIndex to right after the dot of the current match to allow overlapping/chained matches
        memberAccessRegex.lastIndex = match.index + objectName.length + 1;

        // Skip literal system-level prefixes (Vcl.*, System.* style) and self-reference
        if (objectLower === 'me' || objectLower === 'mybase') {
          const fileSyms = indexer.getFileSymbols(document.uri.toString());
          const currentClass = fileSyms?.symbols.find(s =>
            s.kind === 'class' &&
            lineIdx >= s.range.startLine &&
            (s.range.endLine === undefined || lineIdx <= s.range.endLine)
          );
          if (currentClass) {
            const hasMember = this.checkHasClassMember(currentClass.name, memberName, indexer);
            if (!hasMember) {
              const start = match.index + objectName.length + 1;
              const range = new vscode.Range(lineIdx, start, lineIdx, start + memberName.length);
              diagnostics.push(new vscode.Diagnostic(
                range,
                `Membro "${memberName}" não encontrado na classe "${currentClass.name}".`,
                vscode.DiagnosticSeverity.Error
              ));
            }
          }
          continue;
        }

        // Skip VCL and System low-level prefixes to avoid false positives on Delphi internals
        if (objectLower.startsWith('vcl') || objectLower.startsWith('system')) {
          continue;
        }

        // Check if objectName is a variable with a resolved type
        let typeName = TypeResolver.getVariableType(objectName, document, new vscode.Position(lineIdx, match.index), indexer);
        if (!typeName) {
          // Only accept static symbols if they represent classes, structures, or namespaces
          const staticSymbol = indexer.findSymbolByName(objectName, document.uri.toString());
          if (staticSymbol && (staticSymbol.kind === 'class' || staticSymbol.kind === 'structure' || staticSymbol.kind === 'namespace')) {
            typeName = staticSymbol.name;
          } else {
            const sysStaticSymbol = SYSTEM_SYMBOLS.find(s => s.name.toLowerCase() === objectLower && (s.kind === 'namespace' || s.kind === 'class' || s.kind === 'structure'));
            if (sysStaticSymbol) {
              typeName = sysStaticSymbol.name;
            }
          }
        }

        if (typeName) {
          // If the type is explicitly known, validate that the member exists. Otherwise, assume external Delphi/VCL type and skip to avoid false positives.
          if (this.isKnownType(typeName, indexer)) {
            const hasMember = this.checkHasClassMember(typeName, memberName, indexer);
            if (!hasMember) {
              if (typeName.toLowerCase() !== 'variant' && typeName.toLowerCase() !== 'tobject' && typeName.toLowerCase() !== 'void') {
                const start = match.index + objectName.length + 1;
                const range = new vscode.Range(lineIdx, start, lineIdx, start + memberName.length);
                diagnostics.push(new vscode.Diagnostic(
                  range,
                  `Membro "${memberName}" não encontrado na classe/tipo "${typeName}".`,
                  vscode.DiagnosticSeverity.Error
                ));
              }
            }
          }
        }
      }
    });

    // 3. Scan for type references: As [New] Type, New Type, Inherits Type, Implements Type
    const typeRefRegex = /\bAs\s+(?:New\s+)?([a-zA-Z0-9_.]+)/gi;
    const newInstRegex = /\bNew\s+([a-zA-Z0-9_.]+)/gi;
    const inheritsRegex = /\bInherits\s+([a-zA-Z0-9_.]+)/gi;
    const implementsRegex = /\bImplements\s+([a-zA-Z0-9_.]+)/gi;

    lines.forEach((lineText, lineIdx) => {
      const cleanLine = DependencyScanner.stripComments(lineText);
      if (!cleanLine.trim() || cleanLine.toLowerCase().startsWith('imports ')) return;

      let match;
      typeRefRegex.lastIndex = 0;
      while ((match = typeRefRegex.exec(cleanLine)) !== null) {
        const typeName = match[1];
        const start = match.index + match[0].indexOf(typeName);
        this.validateTypeReference(typeName, lineIdx, start, document, indexer, diagnostics);
      }

      newInstRegex.lastIndex = 0;
      while ((match = newInstRegex.exec(cleanLine)) !== null) {
        const precedingText = cleanLine.substring(0, match.index).trim();
        if (precedingText.toLowerCase().endsWith('as')) {
          continue;
        }
        const typeName = match[1];
        const start = match.index + match[0].indexOf(typeName);
        this.validateTypeReference(typeName, lineIdx, start, document, indexer, diagnostics);
      }

      inheritsRegex.lastIndex = 0;
      while ((match = inheritsRegex.exec(cleanLine)) !== null) {
        const typeName = match[1];
        const start = match.index + match[0].indexOf(typeName);
        this.validateTypeReference(typeName, lineIdx, start, document, indexer, diagnostics);
      }

      implementsRegex.lastIndex = 0;
      while ((match = implementsRegex.exec(cleanLine)) !== null) {
        const typeName = match[1];
        const start = match.index + match[0].indexOf(typeName);
        this.validateTypeReference(typeName, lineIdx, start, document, indexer, diagnostics);
      }
    });

    return diagnostics;
  }
}
