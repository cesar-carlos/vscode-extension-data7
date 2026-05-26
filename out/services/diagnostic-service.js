"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticService = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const dependency_scanner_1 = require("../dependency-scanner");
const symbol_indexer_1 = require("../symbol-indexer");
const diagnostics_1 = require("../diagnostics");
const project_service_1 = require("./project-service");
const repository_service_1 = require("./repository-service");
class DiagnosticService {
    static initialize(context) {
        this._collection = vscode.languages.createDiagnosticCollection('data7');
        context.subscriptions.push(this._collection);
        const triggerDiagnostics = (doc) => {
            if (doc.languageId === 'd7basic' || doc.fileName.endsWith('.bas')) {
                symbol_indexer_1.WorkspaceSymbolIndexer.getInstance().updateFileContent(doc.uri.toString(), doc.getText());
            }
            this.refreshDiagnostics(doc);
        };
        vscode.workspace.onDidOpenTextDocument(triggerDiagnostics, null, context.subscriptions);
        vscode.workspace.onDidSaveTextDocument(triggerDiagnostics, null, context.subscriptions);
        vscode.workspace.onDidChangeTextDocument(e => triggerDiagnostics(e.document), null, context.subscriptions);
    }
    static getCollection() {
        return this._collection;
    }
    /**
     * Refreshes diagnostics for all visible editors
     */
    static refreshAllActive() {
        vscode.window.visibleTextEditors.forEach(editor => {
            this.refreshDiagnostics(editor.document);
        });
    }
    /**
     * Run diagnostic rules on a text document
     */
    static refreshDiagnostics(document) {
        if (document.languageId !== 'd7basic' && !document.fileName.endsWith('.bas')) {
            return;
        }
        const paths = project_service_1.ProjectService.findProjectPaths(document.fileName);
        if (!paths) {
            if (this._collection) {
                this._collection.delete(document.uri);
            }
            return;
        }
        const diagnostics = [];
        const text = document.getText();
        // 1. Read data7.json dependencies
        let dependencies = {};
        const configJsonPath = path.join(paths.workspaceDir, 'data7.json');
        if (fs.existsSync(configJsonPath)) {
            try {
                const meta = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
                dependencies = meta.dependencies || {};
            }
            catch { }
        }
        // 2. Scan shared modules in exclusive path
        const repoBasPath = repository_service_1.RepositoryService.getRepoBasPath();
        const sharedModules = dependency_scanner_1.DependencyScanner.scanSharedModules(repoBasPath);
        // 3. Scan local modules in src
        const srcDir = path.join(paths.workspaceDir, 'src');
        const localModules = new Set();
        if (fs.existsSync(srcDir)) {
            const basFiles = dependency_scanner_1.DependencyScanner.getFilesRecursive(srcDir, ['.bas']);
            basFiles.forEach(file => {
                const filename = path.basename(file, '.bas');
                localModules.add(filename.toLowerCase());
                try {
                    const content = fs.readFileSync(file, 'utf-8');
                    const nsMatch = content.match(/\bNamespace\s+([a-zA-Z0-9_]+)/i);
                    if (nsMatch) {
                        localModules.add(nsMatch[1].toLowerCase());
                    }
                }
                catch { }
            });
        }
        // 4. Scan document references line by line
        const lines = text.split(/\r?\n/);
        const importsRegex = /\bImports\s+([a-zA-Z0-9_]+)/i;
        const directCallRegex = /\b(mod_[a-zA-Z0-9_]+|[a-zA-Z0-9_]+)(?=\.)/i;
        lines.forEach((lineText, lineIndex) => {
            const cleanLine = dependency_scanner_1.DependencyScanner.stripComments(lineText);
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
                if (!dependency_scanner_1.DependencyScanner.isIgnoredNamespace(lowerModName)) {
                    this.validateModuleReference(modName, lowerModName, lineIndex, cleanLine.indexOf(modName), diagnostics, localModules, dependencies, sharedModules, false);
                }
            }
        });
        // Run advanced diagnostics and append them
        try {
            const advanced = diagnostics_1.DiagnosticsLinter.runAdvancedDiagnostics(document, symbol_indexer_1.WorkspaceSymbolIndexer.getInstance());
            diagnostics.push(...advanced);
        }
        catch (err) {
            console.error('Erro ao executar diagnósticos avançados:', err);
        }
        if (this._collection) {
            this._collection.set(document.uri, diagnostics);
        }
    }
    static validateModuleReference(modName, lowerModName, lineIndex, charIndex, diagnostics, localModules, dependencies, sharedModules, isExplicit) {
        if (localModules.has(lowerModName)) {
            return;
        }
        if (dependency_scanner_1.DependencyScanner.isIgnoredNamespace(lowerModName)) {
            return;
        }
        let resolvedKey = lowerModName;
        if (!sharedModules.has(resolvedKey)) {
            if (sharedModules.has('mod_' + resolvedKey)) {
                resolvedKey = 'mod_' + resolvedKey;
            }
            else {
                if (isExplicit || lowerModName.startsWith('mod_')) {
                    const range = new vscode.Range(lineIndex, charIndex, lineIndex, charIndex + modName.length);
                    const diagnostic = new vscode.Diagnostic(range, `Módulo "${modName}" não foi encontrado. Implemente-o localmente ou adicione-o ao repositório global de módulos.`, vscode.DiagnosticSeverity.Error);
                    diagnostics.push(diagnostic);
                }
                return;
            }
        }
        const isDeclared = Object.keys(dependencies).some(k => k.toLowerCase() === resolvedKey);
        if (!isDeclared) {
            const range = new vscode.Range(lineIndex, charIndex, lineIndex, charIndex + modName.length);
            const diagnostic = new vscode.Diagnostic(range, `Módulo "${sharedModules.get(resolvedKey).moduleName}" está disponível globalmente, mas não está declarado nas dependências do projeto. Use a opção de instalação rápida.`, vscode.DiagnosticSeverity.Error);
            diagnostics.push(diagnostic);
        }
    }
}
exports.DiagnosticService = DiagnosticService;
//# sourceMappingURL=diagnostic-service.js.map