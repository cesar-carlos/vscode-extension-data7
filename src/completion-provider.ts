import * as vscode from 'vscode';
import { WorkspaceSymbolIndexer, SymbolInfo, FileSymbols } from './symbol-indexer';
import { SYSTEM_SYMBOLS } from './system-library';

const KEYWORDS = [
  'Imports', 'Namespace', 'Class', 'Structure', 'Delegate', 'Property', 'Get', 'Set', 'Shared', 'Sub', 'Function', 'Dim', 'As',
  'If', 'Then', 'Else', 'ElseIf', 'End If',
  'Select Case', 'Case', 'End Select',
  'For', 'To', 'Step', 'Next', 'Each', 'In',
  'Do', 'Loop', 'While', 'Until',
  'Try', 'Catch', 'Finally', 'End Try',
  'Return', 'New', 'Inherits', 'MyBase', 'Me', 'Null', 'Exit', 'Overrides', 'Overridable', 'Private', 'Public', 'Protected', 'Declare', 'Lib', 'Alias'
];

export class TypeResolver {
  public static getVariableType(
    varName: string,
    document: vscode.TextDocument,
    position: vscode.Position,
    indexer: WorkspaceSymbolIndexer
  ): string | undefined {
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const varLower = varName.toLowerCase();

    // 1. Scan upwards to find declaration: Dim name As Type or Dim name As New Type()
    for (let i = position.line; i >= 0; i--) {
      const lineText = lines[i].trim();
      if (lineText.startsWith("'") || lineText.toLowerCase().startsWith('rem ')) continue;

      const regex = new RegExp(`\\b(?:Dim|Private|Public|Protected|Shared)?\\s+${varName}\\b(?:\\s+As\\s+(?:New\\s+)?([a-zA-Z0-9_.]+))?`, 'i');
      const match = lineText.match(regex);
      if (match) {
        return match[1] || 'Variant';
      }
    }

    // 2. Scan parameter declarations of current method/function
    const fileSyms = indexer.getFileSymbols(document.uri.toString());
    if (fileSyms) {
      // Find current active method
      const currentMethod = fileSyms.symbols.find(s => 
        s.kind === 'method' && 
        position.line >= s.range.startLine && 
        (s.range.endLine === undefined || position.line <= s.range.endLine)
      );
      if (currentMethod && currentMethod.parameters) {
        const param = currentMethod.parameters.find(p => p.name.toLowerCase() === varLower);
        if (param) {
          return param.type;
        }
      }

      // 3. Scan fields of current class
      const currentClass = fileSyms.symbols.find(s => 
        s.kind === 'class' && 
        position.line >= s.range.startLine && 
        (s.range.endLine === undefined || position.line <= s.range.endLine)
      );
      if (currentClass) {
        const field = fileSyms.symbols.find(s => 
          s.containerName?.toLowerCase() === currentClass.name.toLowerCase() && 
          s.name.toLowerCase() === varLower && 
          s.kind === 'variable'
        );
        if (field) {
          return field.type;
        }
      }

      // 4. Scan namespace level variables
      const globalVar = fileSyms.symbols.find(s => 
        s.name.toLowerCase() === varLower && 
        s.kind === 'variable' && 
        !s.containerName
      );
      if (globalVar) {
        return globalVar.type;
      }
    }

    return undefined;
  }

  /**
   * Resolves a class symbol by name, supporting both simple names ('TStrings')
   * and fully-qualified names ('Collections.TStrings').
   * Searches system library first, then workspace.
   */
  public static findClassSymbol(
    qualifiedOrSimpleName: string,
    indexer: WorkspaceSymbolIndexer
  ): SymbolInfo | undefined {
    const lower = qualifiedOrSimpleName.toLowerCase();

    if (qualifiedOrSimpleName.includes('.')) {
      // Split into namespace part and class name part
      const lastDot = qualifiedOrSimpleName.lastIndexOf('.');
      const namePart  = qualifiedOrSimpleName.substring(lastDot + 1).toLowerCase();
      const nsPart    = qualifiedOrSimpleName.substring(0, lastDot).toLowerCase();

      // 1. Exact match: name + containerName
      const exact = SYSTEM_SYMBOLS.find(s =>
        s.kind === 'class' &&
        s.name.toLowerCase() === namePart &&
        s.containerName?.toLowerCase() === nsPart
      );
      if (exact) return exact;

      // 2. Name-only fallback in system library
      const byName = SYSTEM_SYMBOLS.find(s => s.kind === 'class' && s.name.toLowerCase() === namePart);
      if (byName) return byName;

      // 3. Workspace fallback
      return indexer.findSymbolByName(namePart);
    }

    // Simple name — search system library then workspace
    return (
      SYSTEM_SYMBOLS.find(s => s.kind === 'class' && s.name.toLowerCase() === lower) ??
      indexer.findSymbolByName(qualifiedOrSimpleName)
    );
  }

  public static getInheritedMembers(
    className: string,
    indexer: WorkspaceSymbolIndexer
  ): SymbolInfo[] {
    const members: SymbolInfo[] = [];
    const visited = new Set<string>();

    const resolveMembers = (currentClassName: string) => {
      const key = currentClassName.toLowerCase();
      if (visited.has(key)) return;
      visited.add(key);

      const classSymbol = TypeResolver.findClassSymbol(currentClassName, indexer);
      if (!classSymbol) return;

      // Collect members — containerName may be short ('TStrings') or qualified ('Collections.TStrings')
      const shortName = currentClassName.includes('.')
        ? currentClassName.split('.').pop()!.toLowerCase()
        : currentClassName.toLowerCase();

      const systemMembers = SYSTEM_SYMBOLS.filter(s =>
        s.containerName !== undefined &&
        (s.containerName.toLowerCase() === key ||
          s.containerName.toLowerCase() === shortName)
      );
      members.push(...systemMembers);

      const workspaceMembers = indexer.getAllSymbols().filter(s =>
        s.containerName !== undefined &&
        (s.containerName.toLowerCase() === key ||
          s.containerName.toLowerCase() === shortName)
      );
      members.push(...workspaceMembers);

      if (classSymbol.inheritsFrom) {
        resolveMembers(classSymbol.inheritsFrom);
      }
    };

    // Start from the direct parent of className
    const startClass = TypeResolver.findClassSymbol(className, indexer);
    if (startClass?.inheritsFrom) {
      resolveMembers(startClass.inheritsFrom);
    }

    return members;
  }
}

export class D7BasicCompletionProvider implements vscode.CompletionItemProvider {
  private indexer = WorkspaceSymbolIndexer.getInstance();

  /**
   * Returns all members (own + inherited) for a given type name.
   * Handles both short names (e.g. 'TStringList') and fully-qualified names
   * (e.g. 'Collections.TStringList'), matching containerName by either form.
   */
  public static getAllMembersForType(typeName: string, indexer: WorkspaceSymbolIndexer): SymbolInfo[] {
    const members: SymbolInfo[] = [];
    const visited = new Set<string>();

    const collect = (currentTypeName: string) => {
      const key = currentTypeName.toLowerCase();
      if (visited.has(key)) return;
      visited.add(key);

      // Use the central resolver that understands qualified names like 'Collections.TStrings'
      const classSymbol = TypeResolver.findClassSymbol(currentTypeName, indexer);
      if (!classSymbol) return;

      const shortName = currentTypeName.includes('.')
        ? currentTypeName.split('.').pop()!.toLowerCase()
        : currentTypeName.toLowerCase();

      // Collect own members (match by qualified key OR short name)
      const systemMembers = SYSTEM_SYMBOLS.filter(s =>
        s.containerName !== undefined &&
        (s.containerName.toLowerCase() === key ||
          s.containerName.toLowerCase() === shortName)
      );
      members.push(...systemMembers);

      const workspaceMembers = indexer.getAllSymbols().filter(s =>
        s.containerName !== undefined &&
        (s.containerName.toLowerCase() === key ||
          s.containerName.toLowerCase() === shortName)
      );
      members.push(...workspaceMembers);

      // Recurse into parent class
      if (classSymbol.inheritsFrom) {
        collect(classSymbol.inheritsFrom);
      }
    };

    collect(typeName);
    return members;
  }

  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
    
    const items: vscode.CompletionItem[] = [];
    const lineText = document.lineAt(position.line).text;
    
    // Determine context up to cursor
    const textBeforeCursor = lineText.substring(0, position.character);
    const dotIndex = textBeforeCursor.lastIndexOf('.');

    // Case A: Cursor is after a dot (e.g. `obj.`, `me.`, `Forms.`)
    if (dotIndex !== -1 && textBeforeCursor.substring(dotIndex + 1).trim() === textBeforeCursor.substring(dotIndex + 1)) {
      const prefix = textBeforeCursor.substring(0, dotIndex).trim();
      const lastWordMatch = prefix.match(/([a-zA-Z0-9_]+)$/);
      
      if (lastWordMatch) {
        const triggerWord = lastWordMatch[1];
        const triggerLower = triggerWord.toLowerCase();

        // A.1: me. or mybase.
        if (triggerLower === 'me' || triggerLower === 'mybase') {
          const fileSyms = this.indexer.getFileSymbols(document.uri.toString());
          if (fileSyms) {
            // Find current class context
            const currentClass = fileSyms.symbols.find(s => 
              s.kind === 'class' && 
              position.line >= s.range.startLine && 
              (s.range.endLine === undefined || position.line <= s.range.endLine)
            );

            if (currentClass) {
              if (triggerLower === 'me') {
                // Add local methods, fields, properties of the class
                const locals = fileSyms.symbols.filter(s => s.containerName?.toLowerCase() === currentClass.name.toLowerCase());
                locals.forEach(s => items.push(this.createCompletionItem(s, document)));
              }
              // Add inherited base class members (for both me. and mybase.)
              const inherited = TypeResolver.getInheritedMembers(currentClass.name, this.indexer);
              inherited.forEach(s => items.push(this.createCompletionItem(s, document)));
            }
          }
          return items;
        }

        // A.2: System or Workspace Namespace (e.g., `Data7.`, `SQL.`, `console.`)
        // Check if triggerWord is a namespace or class name
        const isNamespaceOrStaticClass = SYSTEM_SYMBOLS.some(s => 
          (s.name.toLowerCase() === triggerLower && (s.kind === 'namespace' || s.kind === 'class')) ||
          (s.containerName?.toLowerCase() === triggerLower)
        ) || this.indexer.getAllSymbols().some(s => 
          (s.name.toLowerCase() === triggerLower && (s.kind === 'namespace' || s.kind === 'class')) ||
          (s.containerName?.toLowerCase() === triggerLower)
        );

        if (isNamespaceOrStaticClass) {
          // Suggest members belonging to this namespace or class
          const systemMembers = SYSTEM_SYMBOLS.filter(s => s.containerName?.toLowerCase() === triggerLower);
          systemMembers.forEach(s => items.push(this.createCompletionItem(s, document)));

          const workspaceMembers = this.indexer.getAllSymbols().filter(s => s.containerName?.toLowerCase() === triggerLower);
          workspaceMembers.forEach(s => items.push(this.createCompletionItem(s, document)));

          return items;
        }

        // A.3: Instance Variable (e.g., `_query.`, `args.`)
        // Resolve the variable's type, then collect own + inherited members
        const typeName = TypeResolver.getVariableType(triggerWord, document, position, this.indexer);
        if (typeName) {
          const allMembers = D7BasicCompletionProvider.getAllMembersForType(typeName, this.indexer);
          allMembers.forEach(s => items.push(this.createCompletionItem(s, document)));
        }
      }
      return items;
    }

    // Case B: General Context Autocomplete (Keywords, Snippets, Globals)
    // B.1 Add Keywords
    KEYWORDS.forEach(kw => {
      items.push(new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword));
    });

    // B.2 Add Snippets
    this.addSnippets(items);

    // B.3 Add Globals from System Library (namespaces, classes, functions)
    SYSTEM_SYMBOLS.forEach(s => {
      // Exclude nested members from global level unless they are namespaces/classes or global standalone functions
      if (!s.containerName || s.kind === 'namespace' || s.kind === 'class' || s.kind === 'declare_function' || s.kind === 'declare_sub') {
        items.push(this.createCompletionItem(s, document));
      }
    });

    // B.4 Add Globals from Workspace
    this.indexer.getAllSymbols().forEach(s => {
      if (!s.containerName || s.kind === 'namespace' || s.kind === 'class') {
        items.push(this.createCompletionItem(s, document));
      }
    });

    return items;
  }

  private createCompletionItem(s: SymbolInfo, document: vscode.TextDocument): vscode.CompletionItem {
    let kind = vscode.CompletionItemKind.Variable;
    switch (s.kind) {
      case 'namespace': kind = vscode.CompletionItemKind.Module; break;
      case 'class': kind = vscode.CompletionItemKind.Class; break;
      case 'structure': kind = vscode.CompletionItemKind.Struct; break;
      case 'delegate': kind = vscode.CompletionItemKind.Interface; break;
      case 'method': kind = vscode.CompletionItemKind.Method; break;
      case 'declare_function': kind = vscode.CompletionItemKind.Function; break;
      case 'declare_sub': kind = vscode.CompletionItemKind.Method; break;
      case 'property': kind = vscode.CompletionItemKind.Property; break;
      case 'variable': kind = vscode.CompletionItemKind.Field; break;
    }

    let labelInput: string | vscode.CompletionItemLabel = s.name;
    const hasParams = s.kind === 'method' || s.kind === 'declare_function' || s.kind === 'declare_sub' || s.kind === 'delegate';
    if (hasParams) {
      const params = s.parameters || [];
      const paramsStr = params.map(p => {
        let pStr = '';
        if (p.isByRef) pStr += 'ByRef ';
        pStr += p.name;
        if (p.type) pStr += ' As ' + p.type;
        if (p.isOptional) {
          pStr += ' = ' + (p.defaultValue || '...');
        }
        return pStr;
      }).join(', ');
      
      labelInput = {
        label: s.name,
        detail: `(${paramsStr})`
      };
    }

    const item = new vscode.CompletionItem(labelInput, kind);
    item.insertText = s.name;
    item.detail = s.kind.toUpperCase() + (s.type ? `: ${s.type}` : '');

    // Add Auto-Import edits for class/structure/delegate symbols from any namespace (user or native)
    if (s.containerName && (s.kind === 'class' || s.kind === 'structure' || s.kind === 'delegate')) {
      const containerLower = s.containerName.toLowerCase();
      // Only skip auto-import for true Delphi/VCL internal prefixes (vcl.*, system.*)
      const isVclOrSystem = containerLower.startsWith('vcl') || containerLower.startsWith('system');
      if (!isVclOrSystem) {
        const fileSyms = this.indexer.getFileSymbols(document.uri.toString());
        const activeNamespace = fileSyms?.symbols.find(x => x.kind === 'namespace')?.name;
        
        const isCurrentNamespace = activeNamespace && activeNamespace.toLowerCase() === containerLower;
        const isAlreadyImported = fileSyms?.imports.some(imp => imp.toLowerCase() === containerLower);
        
        if (!isCurrentNamespace && !isAlreadyImported) {
          let insertLine = 0;
          for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text.trim();
            if (lineText.toLowerCase().startsWith('imports ')) {
              insertLine = i + 1;
            }
          }
          
          item.detail = `(Auto Import de ${s.containerName}) ${item.detail}`;
          const importEdit = new vscode.TextEdit(
            new vscode.Range(new vscode.Position(insertLine, 0), new vscode.Position(insertLine, 0)),
            `Imports ${s.containerName}\r\n`
          );
          item.additionalTextEdits = [importEdit];
        }
      }
    }

    if (s.description) {
      item.documentation = new vscode.MarkdownString(s.description);
    }
    return item;
  }

  private addSnippets(items: vscode.CompletionItem[]) {
    // If Then End If
    const ifSnippet = new vscode.CompletionItem('If...Then', vscode.CompletionItemKind.Snippet);
    ifSnippet.insertText = new vscode.SnippetString('If ${1:condition}\n\t$0\nEnd If');
    ifSnippet.documentation = 'Estrutura Condicional If Then';
    items.push(ifSnippet);

    // For Next
    const forSnippet = new vscode.CompletionItem('For...Next', vscode.CompletionItemKind.Snippet);
    forSnippet.insertText = new vscode.SnippetString('For ${1:i} = 0 To ${2:count} - 1\n\t$0\nNext');
    forSnippet.documentation = 'Loop For Incremental';
    items.push(forSnippet);

    // Try Catch Finally
    const trySnippet = new vscode.CompletionItem('Try...Catch', vscode.CompletionItemKind.Snippet);
    trySnippet.insertText = new vscode.SnippetString('Try\n\t$1\nCatch ${2:ex} As Exception\n\t$0\nEnd Try');
    trySnippet.documentation = 'Tratamento de Exceções Try Catch';
    items.push(trySnippet);

    // Property Block
    const propSnippet = new vscode.CompletionItem('Property Block', vscode.CompletionItemKind.Snippet);
    propSnippet.insertText = new vscode.SnippetString('Property ${1:PropName} As ${2:DataType}\n\tGet\n\t\t${1:PropName} = me._${3:fieldName}\n\tEnd Get\n\tSet(pValue As ${2:DataType})\n\t\tme._${3:fieldName} = pValue\n\tEnd Set\nEnd Property');
    propSnippet.documentation = 'Declaração de Bloco de Propriedade Completa';
    items.push(propSnippet);

    // Function
    const funcSnippet = new vscode.CompletionItem('Function Block', vscode.CompletionItemKind.Snippet);
    funcSnippet.insertText = new vscode.SnippetString('Function ${1:FuncName}($2) As ${3:DataType}\n\t$0\n\t${1:FuncName} = $4\nEnd Function');
    funcSnippet.documentation = 'Declaração de Nova Função';
    items.push(funcSnippet);

    // Sub
    const subSnippet = new vscode.CompletionItem('Sub Block', vscode.CompletionItemKind.Snippet);
    subSnippet.insertText = new vscode.SnippetString('Sub ${1:SubName}($2)\n\t$0\nEnd Sub');
    subSnippet.documentation = 'Declaração de Novo Sub/Procedimento';
    items.push(subSnippet);

    // New Class Constructor
    const ctorSnippet = new vscode.CompletionItem('Constructor (Sub New)', vscode.CompletionItemKind.Snippet);
    ctorSnippet.insertText = new vscode.SnippetString('Sub New($1)\n\tMyBase.New($2)\n\t$0\nEnd Sub');
    ctorSnippet.documentation = 'Construtor da Classe (Sub New)';
    items.push(ctorSnippet);
  }
}
