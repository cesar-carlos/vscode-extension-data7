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
exports.SyncWatcher = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const decompiler_1 = require("../decompiler");
const dependency_scanner_1 = require("../dependency-scanner");
const builder_1 = require("../builder");
const project_service_1 = require("./project-service");
const repository_service_1 = require("./repository-service");
const dependency_service_1 = require("./dependency-service");
const diagnostic_service_1 = require("./diagnostic-service");
const symbol_indexer_1 = require("../symbol-indexer");
class SyncWatcher {
    static acquireSyncLock() {
        if (this._isSyncing) {
            return false;
        }
        this._isSyncing = true;
        return true;
    }
    static releaseSyncLock() {
        setTimeout(() => {
            this._isSyncing = false;
        }, 1000);
    }
    /**
     * Watch changes on the external .7Proj file when editing inside the hidden workspace
     */
    static watchExternalProjectFile(projectFilePath, hiddenFolderDir) {
        if (this._externalFileWatcher) {
            this._externalFileWatcher.close();
        }
        try {
            this._externalFileWatcher = fs.watch(projectFilePath, async (eventType) => {
                if (eventType === 'change') {
                    if (!this.acquireSyncLock()) {
                        return;
                    }
                    try {
                        // Import getKnownSharedModules here or define it locally
                        const repoBasPath = repository_service_1.RepositoryService.getRepoBasPath();
                        let knownSharedModules;
                        if (repoBasPath && fs.existsSync(repoBasPath)) {
                            try {
                                const sharedModules = dependency_scanner_1.DependencyScanner.syncDependencies(path.join(hiddenFolderDir, 'src'), path.join(hiddenFolderDir, 'data7_modules'), repoBasPath, {});
                                knownSharedModules = new Set(sharedModules);
                            }
                            catch { }
                        }
                        decompiler_1.Decompiler.decompileProject(projectFilePath, hiddenFolderDir, knownSharedModules);
                        let dependencies = {};
                        const configJsonPath = path.join(hiddenFolderDir, 'data7.json');
                        if (fs.existsSync(configJsonPath)) {
                            try {
                                const meta = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
                                dependencies = meta.dependencies || {};
                            }
                            catch { }
                        }
                        if (repoBasPath && fs.existsSync(repoBasPath)) {
                            const srcDir = path.join(hiddenFolderDir, 'src');
                            const data7ModulesDir = path.join(hiddenFolderDir, 'data7_modules');
                            dependency_scanner_1.DependencyScanner.syncDependencies(srcDir, data7ModulesDir, repoBasPath, dependencies);
                        }
                        // Sync index cache with the updated workspace structure
                        await symbol_indexer_1.WorkspaceSymbolIndexer.getInstance().indexWorkspace(vscode.workspace.workspaceFolders);
                        diagnostic_service_1.DiagnosticService.refreshAllActive();
                        console.log(`Projeto sincronizado a partir de alteração externa no arquivo: ${projectFilePath}`);
                    }
                    catch (err) {
                        console.error('Falha ao decompor alteração externa:', err);
                    }
                    finally {
                        this.releaseSyncLock();
                    }
                }
            });
        }
        catch (err) {
            console.error('Erro ao registrar fs.watch no .7Proj externo:', err);
        }
    }
    /**
     * Starts workspace auto-sync listener for bas/json files
     */
    static startAutoSync(context) {
        const config = vscode.workspace.getConfiguration('data7');
        const enableAutoSync = config.get('enableAutoSync') !== false;
        if (enableAutoSync) {
            const basWatcher = vscode.workspace.createFileSystemWatcher('**/*.bas');
            const jsonWatcher = vscode.workspace.createFileSystemWatcher('**/data7.json');
            const handleFileChange = async (uri) => {
                const paths = project_service_1.ProjectService.findProjectPaths(uri.fsPath);
                if (!paths) {
                    return;
                }
                const repoBasPath = repository_service_1.RepositoryService.getRepoBasPath();
                if (!repoBasPath || !fs.existsSync(repoBasPath)) {
                    return;
                }
                if (!this.acquireSyncLock()) {
                    return;
                }
                try {
                    await dependency_service_1.DependencyService.detectAndSyncProjectDependencies(paths.workspaceDir);
                    builder_1.Builder.buildProject(paths.workspaceDir, paths.projectFilePath);
                    // Re-index workspace symbols to reflect renamed folders or moved files in real-time
                    await symbol_indexer_1.WorkspaceSymbolIndexer.getInstance().indexWorkspace(vscode.workspace.workspaceFolders);
                    console.log(`Projeto '${path.basename(paths.projectFilePath)}' auto-recompilado com sucesso.`);
                }
                catch (err) {
                    console.error('Falha na recompilação automática:', err);
                }
                finally {
                    this.releaseSyncLock();
                }
            };
            basWatcher.onDidChange(handleFileChange);
            basWatcher.onDidCreate(handleFileChange);
            basWatcher.onDidDelete(handleFileChange);
            jsonWatcher.onDidChange(handleFileChange);
            context.subscriptions.push(basWatcher, jsonWatcher);
        }
    }
    static dispose() {
        if (this._externalFileWatcher) {
            this._externalFileWatcher.close();
        }
    }
}
exports.SyncWatcher = SyncWatcher;
SyncWatcher._isSyncing = false;
//# sourceMappingURL=sync-watcher.js.map