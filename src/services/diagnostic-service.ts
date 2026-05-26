import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DependencyScanner } from '../dependency-scanner';
import { WorkspaceSymbolIndexer } from '../symbol-indexer';
import { DiagnosticsLinter } from '../diagnostics';
import { ProjectService } from './project-service';
import { RepositoryService } from './repository-service';

export class DiagnosticService {
  private static _collection: vscode.DiagnosticCollection;

  public static initialize(context: vscode.ExtensionContext) {
    this._collection = vscode.languages.createDiagnosticCollection('data7');
    context.subscriptions.push(this._collection);

    const triggerDiagnostics = (doc: vscode.TextDocument) => {
      if (doc.languageId === 'd7basic' || doc.fileName.endsWith('.bas')) {
        WorkspaceSymbolIndexer.getInstance().updateFileContent(doc.uri.toString(), doc.getText());
      }
      this.refreshDiagnostics(doc);
    };

    vscode.workspace.onDidOpenTextDocument(triggerDiagnostics, null, context.subscriptions);
    vscode.workspace.onDidSaveTextDocument(triggerDiagnostics, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument(e => triggerDiagnostics(e.document), null, context.subscriptions);
  }

  public static getCollection(): vscode.DiagnosticCollection {
    return this._collection;
  }

  /**
   * Refreshes diagnostics for all visible editors
   */
  public static refreshAllActive() {
    vscode.window.visibleTextEditors.forEach(editor => {
      this.refreshDiagnostics(editor.document);
    });
  }

  /**
   * Run diagnostic rules on a text document
   */
  public static refreshDiagnostics(document: vscode.TextDocument) {
    if (document.languageId !== 'd7basic' && !document.fileName.endsWith('.bas')) {
      return;
    }

    const paths = ProjectService.findProjectPaths(document.fileName);
    if (!paths) {
      if (this._collection) {
        this._collection.delete(document.uri);
      }
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();

    // 1. Read data7.json dependencies
    let dependencies: { [key: string]: string } = {};
    const configJsonPath = path.join(paths.workspaceDir, 'data7.json');
    if (fs.existsSync(configJsonPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
        dependencies = meta.dependencies || {};
      } catch {}
    }

    // 2. Scan shared modules in exclusive path
    const repoBasPath = RepositoryService.getRepoBasPath();
    const sharedModules = DependencyScanner.scanSharedModules(repoBasPath);

    // 3. Scan local modules in src
    const srcDir = path.join(paths.workspaceDir, 'src');
    const localModules = new Set<string>();
    if (fs.existsSync(srcDir)) {
      const basFiles = DependencyScanner.getFilesRecursive(srcDir, ['.bas']);
      basFiles.forEach(file => {
        const filename = path.basename(file, '.bas');
        localModules.add(filename.toLowerCase());
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const nsMatch = content.match(/\bNamespace\s+([a-zA-Z0-9_]+)/i);
          if (nsMatch) {
            localModules.add(nsMatch[1].toLowerCase());
          }
        } catch {}
      });
    }

    // 4. Scan document references line by line
    const lines = text.split(/\r?\n/);
    const importsRegex = /\bImports\s+([a-zA-Z0-9_]+)/i;
    const directCallRegex = /\b(mod_[a-zA-Z0-9_]+|[a-zA-Z0-9_]+)(?=\.)/i;

    lines.forEach((lineText, lineIndex) => {
      const cleanLine = DependencyScanner.stripComments(lineText);
      if (!cleanLine.trim()) {
        return;
      }

      // Check Imports
      let match = cleanLine.match(importsRegex);
      if (match) {
        const modName = match[1];
        const lowerModName = modName.toLowerCase();
        
        this.validateModuleReference(modName, lowerModName, lineIndex, cleanLine.indexOf(modName), diagnostics, localModules, dependencies, sharedModules, true);
      }

      // Check Direct Call
      let dMatch = cleanLine.match(directCallRegex);
      if (dMatch) {
        const modName = dMatch[1];
        const lowerModName = modName.toLowerCase();
        if (!DependencyScanner.isIgnoredNamespace(lowerModName)) {
          this.validateModuleReference(modName, lowerModName, lineIndex, cleanLine.indexOf(modName), diagnostics, localModules, dependencies, sharedModules, false);
        }
      }
    });

    // Run advanced diagnostics and append them
    try {
      const advanced = DiagnosticsLinter.runAdvancedDiagnostics(document, WorkspaceSymbolIndexer.getInstance());
      diagnostics.push(...advanced);
    } catch (err) {
      console.error('Erro ao executar diagnósticos avançados:', err);
    }

    if (this._collection) {
      this._collection.set(document.uri, diagnostics);
    }
  }

  private static validateModuleReference(
    modName: string,
    lowerModName: string,
    lineIndex: number,
    charIndex: number,
    diagnostics: vscode.Diagnostic[],
    localModules: Set<string>,
    dependencies: { [key: string]: string },
    sharedModules: Map<string, any>,
    isExplicit: boolean
  ) {
    if (localModules.has(lowerModName)) {
      return;
    }

    if (DependencyScanner.isIgnoredNamespace(lowerModName)) {
      return;
    }

    let resolvedKey = lowerModName;
    if (!sharedModules.has(resolvedKey)) {
      if (sharedModules.has('mod_' + resolvedKey)) {
        resolvedKey = 'mod_' + resolvedKey;
      } else {
        if (isExplicit || lowerModName.startsWith('mod_')) {
          const range = new vscode.Range(lineIndex, charIndex, lineIndex, charIndex + modName.length);
          const diagnostic = new vscode.Diagnostic(
            range,
            `Módulo "${modName}" não foi encontrado. Implemente-o localmente ou adicione-o ao repositório global de módulos.`,
            vscode.DiagnosticSeverity.Error
          );
          diagnostics.push(diagnostic);
        }
        return;
      }
    }

    const isDeclared = Object.keys(dependencies).some(k => k.toLowerCase() === resolvedKey);
    if (!isDeclared) {
      const range = new vscode.Range(lineIndex, charIndex, lineIndex, charIndex + modName.length);
      const diagnostic = new vscode.Diagnostic(
        range,
        `Módulo "${sharedModules.get(resolvedKey).moduleName}" está disponível globalmente, mas não está declarado nas dependências do projeto. Use a opção de instalação rápida.`,
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(diagnostic);
    }
  }
}
