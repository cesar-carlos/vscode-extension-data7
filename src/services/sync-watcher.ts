import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Decompiler } from '../decompiler';
import { DependencyScanner } from '../dependency-scanner';
import { Builder } from '../builder';
import { ProjectService } from './project-service';
import { RepositoryService } from './repository-service';
import { DependencyService } from './dependency-service';
import { DiagnosticService } from './diagnostic-service';
import { WorkspaceSymbolIndexer } from '../symbol-indexer';

export class SyncWatcher {
  private static _isSyncing = false;
  private static _externalFileWatcher: fs.FSWatcher | undefined;

  private static acquireSyncLock(): boolean {
    if (this._isSyncing) {
      return false;
    }
    this._isSyncing = true;
    return true;
  }

  private static releaseSyncLock() {
    setTimeout(() => {
      this._isSyncing = false;
    }, 1000);
  }

  /**
   * Watch changes on the external .7Proj file when editing inside the hidden workspace
   */
  public static watchExternalProjectFile(projectFilePath: string, hiddenFolderDir: string) {
    if (this._externalFileWatcher) {
      this._externalFileWatcher.close();
    }
    try {
      this._externalFileWatcher = fs.watch(projectFilePath, async (eventType) => {
        if (eventType === 'change') {
          if (!this.acquireSyncLock()) { return; }
          try {
            // Import getKnownSharedModules here or define it locally
            const repoBasPath = RepositoryService.getRepoBasPath();
            let knownSharedModules: Set<string> | undefined;
            if (repoBasPath && fs.existsSync(repoBasPath)) {
              try {
                const sharedModules = DependencyScanner.syncDependencies(
                  path.join(hiddenFolderDir, 'src'),
                  path.join(hiddenFolderDir, 'data7_modules'),
                  repoBasPath,
                  {}
                );
                knownSharedModules = new Set(sharedModules);
              } catch {}
            }

            Decompiler.decompileProject(projectFilePath, hiddenFolderDir, knownSharedModules);
            
            let dependencies = {};
            const configJsonPath = path.join(hiddenFolderDir, 'data7.json');
            if (fs.existsSync(configJsonPath)) {
              try {
                const meta = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
                dependencies = meta.dependencies || {};
              } catch {}
            }

            if (repoBasPath && fs.existsSync(repoBasPath)) {
              const srcDir = path.join(hiddenFolderDir, 'src');
              const data7ModulesDir = path.join(hiddenFolderDir, 'data7_modules');
              DependencyScanner.syncDependencies(srcDir, data7ModulesDir, repoBasPath, dependencies);
            }

            // Sync index cache with the updated workspace structure
            await WorkspaceSymbolIndexer.getInstance().indexWorkspace(vscode.workspace.workspaceFolders);

            DiagnosticService.refreshAllActive();

            console.log(`Projeto sincronizado a partir de alteração externa no arquivo: ${projectFilePath}`);
          } catch (err) {
            console.error('Falha ao decompor alteração externa:', err);
          } finally {
            this.releaseSyncLock();
          }
        }
      });
    } catch (err) {
      console.error('Erro ao registrar fs.watch no .7Proj externo:', err);
    }
  }

  /**
   * Starts workspace auto-sync listener for bas/json files
   */
  public static startAutoSync(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('data7');
    const enableAutoSync = config.get<boolean>('enableAutoSync') !== false;

    if (enableAutoSync) {
      const basWatcher = vscode.workspace.createFileSystemWatcher('**/*.bas');
      const jsonWatcher = vscode.workspace.createFileSystemWatcher('**/data7.json');

      const handleFileChange = async (uri: vscode.Uri) => {
        const paths = ProjectService.findProjectPaths(uri.fsPath);
        if (!paths) { return; }

        const repoBasPath = RepositoryService.getRepoBasPath();
        if (!repoBasPath || !fs.existsSync(repoBasPath)) {
          return;
        }

        if (!this.acquireSyncLock()) { return; }
        try {
          await DependencyService.detectAndSyncProjectDependencies(paths.workspaceDir);
          Builder.buildProject(paths.workspaceDir, paths.projectFilePath);
          
          // Re-index workspace symbols to reflect renamed folders or moved files in real-time
          await WorkspaceSymbolIndexer.getInstance().indexWorkspace(vscode.workspace.workspaceFolders);

          console.log(`Projeto '${path.basename(paths.projectFilePath)}' auto-recompilado com sucesso.`);
        } catch (err) {
          console.error('Falha na recompilação automática:', err);
        } finally {
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

  public static dispose() {
    if (this._externalFileWatcher) {
      this._externalFileWatcher.close();
    }
  }
}
