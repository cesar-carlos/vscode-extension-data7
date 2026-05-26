import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DependencyScanner } from '../dependency-scanner';
import { Builder } from '../builder';
import { ProjectService } from './project-service';
import { RepositoryService } from './repository-service';
import { DiagnosticService } from './diagnostic-service';

export class DependencyService {
  /**
   * Scan project and auto-detect/sync dependencies with the private repository path
   */
  public static async detectAndSyncProjectDependencies(workspaceDir: string): Promise<string[]> {
    const configJsonPath = path.join(workspaceDir, 'data7.json');
    if (!fs.existsSync(configJsonPath)) {
      return [];
    }

    let projectMeta: any;
    try {
      projectMeta = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
    } catch (err) {
      console.error('Erro ao ler data7.json:', err);
      return [];
    }

    if (!projectMeta.dependencies) {
      projectMeta.dependencies = {};
    }

    const srcDir = path.join(workspaceDir, 'src');
    if (!fs.existsSync(srcDir)) {
      return [];
    }

    const repoBasPath = RepositoryService.getRepoBasPath();
    if (!repoBasPath || !fs.existsSync(repoBasPath)) {
      return [];
    }

    const sharedModules = DependencyScanner.scanSharedModules(repoBasPath);

    const localModules = new Set<string>();
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

    const filesToScan: string[] = [...basFiles];
    const scannedFiles = new Set<string>();
    const resolvedDependencies = new Map<string, any>();
    const missingModules = new Set<string>();

    const importsRegex = /\bImports\s+([a-zA-Z0-9_]+)/i;
    const directCallRegex = /\b(mod_[a-zA-Z0-9_]+|[a-zA-Z0-9_]+)(?=\.)/i;

    function processReferencedModuleName(rawModName: string, isExplicit: boolean) {
      if (DependencyScanner.isIgnoredNamespace(rawModName)) {
        return;
      }

      const lowerModName = rawModName.toLowerCase();

      if (localModules.has(lowerModName)) {
        return;
      }

      let resolvedKey = lowerModName;
      let found = sharedModules.has(resolvedKey);
      if (!found) {
        if (sharedModules.has('mod_' + resolvedKey)) {
          resolvedKey = 'mod_' + resolvedKey;
          found = true;
        } else if (resolvedKey.startsWith('mod_') && sharedModules.has(resolvedKey.substring(4))) {
          resolvedKey = resolvedKey.substring(4);
          found = true;
        }
      }

      if (found) {
        const resolvedInfo = sharedModules.get(resolvedKey)!;
        if (!resolvedDependencies.has(resolvedKey)) {
          resolvedDependencies.set(resolvedKey, resolvedInfo);
          filesToScan.push(resolvedInfo.sourceFilePath);
        }
      } else {
        if (isExplicit || lowerModName.startsWith('mod_')) {
          missingModules.add(rawModName);
        }
      }
    }

    while (filesToScan.length > 0) {
      const currentFilePath = filesToScan.shift()!;
      const lowerPath = currentFilePath.toLowerCase();
      if (scannedFiles.has(lowerPath)) {
        continue;
      }
      scannedFiles.add(lowerPath);

      try {
        const fileContent = fs.readFileSync(currentFilePath, 'utf-8');
        const lines = fileContent.split(/\r?\n/);
        
        lines.forEach(lineText => {
          const cleanLine = DependencyScanner.stripComments(lineText);
          if (!cleanLine.trim()) {
            return;
          }

          let match = cleanLine.match(importsRegex);
          if (match) {
            processReferencedModuleName(match[1], true);
          }

          let dMatch = cleanLine.match(directCallRegex);
          if (dMatch) {
            processReferencedModuleName(dMatch[1], false);
          }
        });
      } catch (err) {
        console.error(`Erro ao escanear arquivo ${currentFilePath} para dependências:`, err);
      }
    }

    let dependenciesUpdated = false;
    const newDeps: { [key: string]: string } = {};

    for (const [key, info] of resolvedDependencies.entries()) {
      const actualName = info.moduleName;
      const version = info.version || '1.0.0.0';
      newDeps[actualName.toLowerCase()] = version;

      if (!projectMeta.dependencies[actualName.toLowerCase()]) {
        dependenciesUpdated = true;
        console.log(`Auto-detectada dependência: ${actualName} (adicionada ao data7.json)`);
      }
    }

    for (const existingKey of Object.keys(projectMeta.dependencies)) {
      if (!newDeps[existingKey.toLowerCase()]) {
        dependenciesUpdated = true;
        console.log(`Removendo dependência não referenciada: ${existingKey}`);
      }
    }

    projectMeta.dependencies = newDeps;

    if (dependenciesUpdated) {
      try {
        fs.writeFileSync(configJsonPath, JSON.stringify(projectMeta, null, 2), 'utf-8');
      } catch (err) {
        console.error('Erro ao escrever data7.json atualizado:', err);
      }
    }

    const data7ModulesDir = path.join(workspaceDir, 'data7_modules');
    const synced = DependencyScanner.syncDependencies(srcDir, data7ModulesDir, repoBasPath, projectMeta.dependencies);

    if (missingModules.size > 0) {
      vscode.window.showWarningMessage(
        `Os seguintes módulos referenciados não foram encontrados no repositório nem no projeto local: ${Array.from(missingModules).join(', ')}`
      );
    }

    return synced;
  }

  /**
   * Install dependency module (NPM-like manager)
   */
  public static async installModule() {
    const project = ProjectService.getActiveProject();
    if (!project) {
      vscode.window.showErrorMessage('Nenhum projeto Data7 ativo detectado para instalar dependências.');
      return;
    }

    const repoBasPath = RepositoryService.getRepoBasPath();

    // 1. Scan available shared modules
    const sharedModules = DependencyScanner.scanSharedModules(repoBasPath);
    if (sharedModules.size === 0) {
      vscode.window.showErrorMessage('Nenhum módulo compartilhado foi encontrado no repositório configurado.');
      return;
    }

    // 2. Load existing dependencies
    const configJsonPath = path.join(project.workspaceDir, 'data7.json');
    let projectMeta: any = { dependencies: {} };
    if (fs.existsSync(configJsonPath)) {
      try {
        projectMeta = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
        if (!projectMeta.dependencies) {
          projectMeta.dependencies = {};
        }
      } catch {}
    }

    // 3. Render QuickPick items
    const quickPickItems = Array.from(sharedModules.values()).map(info => {
      const isAlreadyInstalled = !!projectMeta.dependencies[info.moduleName.toLowerCase()];
      return {
        label: info.moduleName,
        description: `v${info.version || '1.0.0.0'}` + (isAlreadyInstalled ? ' (já instalado)' : ''),
        detail: `Origem: ${path.basename(info.sourceFilePath)}`
      };
    });

    const selected = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: 'Selecione o módulo compartilhado para instalar no projeto',
      ignoreFocusOut: true
    });

    if (!selected) {
      return;
    }

    // 4. Update dependencies in JSON config
    const versionString = selected.description.split(' ')[0].replace(/^v/, '');
    projectMeta.dependencies[selected.label.toLowerCase()] = versionString;
    fs.writeFileSync(configJsonPath, JSON.stringify(projectMeta, null, 2), 'utf-8');

    // 5. Trigger sync and rebuild
    try {
      const srcDir = path.join(project.workspaceDir, 'src');
      const data7ModulesDir = path.join(project.workspaceDir, 'data7_modules');
      
      DependencyScanner.syncDependencies(srcDir, data7ModulesDir, repoBasPath, projectMeta.dependencies);
      Builder.buildProject(project.workspaceDir, project.projectFilePath);

      vscode.window.showInformationMessage(`Módulo "${selected.label}" v${versionString} instalado e compilado com sucesso!`);
      
      DiagnosticService.refreshAllActive();
    } catch (err: any) {
      vscode.window.showErrorMessage(`Falha na instalação/build do módulo: ${err.message}`);
    }
  }

  /**
   * Pull latest dependency updates from exclusive repository path
   */
  public static async updateDependencies() {
    const project = ProjectService.getActiveProject();
    if (!project) {
      vscode.window.showErrorMessage('Nenhum projeto Data7 ativo detectado para atualizar dependências.');
      return;
    }

    const repoBasPath = RepositoryService.getRepoBasPath();

    const configJsonPath = path.join(project.workspaceDir, 'data7.json');
    if (!fs.existsSync(configJsonPath)) {
      vscode.window.showErrorMessage('Projeto data7.json não encontrado.');
      return;
    }

    let projectMeta: any = { dependencies: {} };
    try {
      projectMeta = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
    } catch {}

    const deps = projectMeta.dependencies || {};
    if (Object.keys(deps).length === 0) {
      vscode.window.showWarningMessage('Nenhuma dependência declarada em data7.json.');
      return;
    }

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Atualizando dependências do projeto...',
      cancellable: false
    }, async () => {
      try {
        const srcDir = path.join(project.workspaceDir, 'src');
        const data7ModulesDir = path.join(project.workspaceDir, 'data7_modules');
        
        const synced = DependencyScanner.syncDependencies(srcDir, data7ModulesDir, repoBasPath, deps);
        
        const sharedModules = DependencyScanner.scanSharedModules(repoBasPath);
        const updatedList = synced.map(name => {
          const info = sharedModules.get(name.toLowerCase());
          return `${info?.moduleName || name} (v${info?.version || '1.0.0.0'})`;
        });

        Builder.buildProject(project.workspaceDir, project.projectFilePath);

        if (updatedList.length > 0) {
          vscode.window.showInformationMessage(`Dependências atualizadas com sucesso: ${updatedList.join(', ')}`);
        } else {
          vscode.window.showInformationMessage('Todas as dependências já estão atualizadas.');
        }

        DiagnosticService.refreshAllActive();
      } catch (err: any) {
        vscode.window.showErrorMessage(`Falha ao atualizar dependências: ${err.message}`);
      }
    });
  }
}
