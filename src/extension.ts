import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Decompiler } from './decompiler';
import { DependencyScanner } from './dependency-scanner';
import { WorkspaceSymbolIndexer } from './symbol-indexer';
import { D7BasicCompletionProvider } from './completion-provider';
import { D7BasicDefinitionProvider } from './definition-provider';
import { D7BasicHoverProvider } from './hover-provider';
import { D7BasicSignatureHelpProvider } from './signature-provider';
import { D7BasicFormattingProvider } from './formatter';
import { D7BasicCodeActionProvider } from './code-actions';
import { Builder } from './builder';

// Services
import { ExtensionContextHolder } from './services/context';
import { ProjectService } from './services/project-service';
import { RepositoryService } from './services/repository-service';
import { DependencyService } from './services/dependency-service';
import { BuildService } from './services/build-service';
import { SyncWatcher } from './services/sync-watcher';
import { DiagnosticService } from './services/diagnostic-service';

// Export for backwards compatibility in tests
export function getRepoBasPath(): string {
  return RepositoryService.getRepoBasPath();
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Extensão Data7 Dev Studio ativada.');

  // Initialize context holder
  ExtensionContextHolder.setContext(context);

  // Initialize symbol indexer for the current workspace
  const indexer = WorkspaceSymbolIndexer.getInstance();
  indexer.indexWorkspace(vscode.workspace.workspaceFolders).catch(err => {
    console.error('Erro ao indexar workspace:', err);
  });

  // Watch for external .bas file modifications to keep symbol index up-to-date
  const indexerWatcher = vscode.workspace.createFileSystemWatcher('**/*.bas');
  indexerWatcher.onDidChange(uri => indexer.indexFile(uri.toString()));
  indexerWatcher.onDidCreate(uri => indexer.indexFile(uri.toString()));
  indexerWatcher.onDidDelete(uri => indexer.removeFile(uri.toString()));
  context.subscriptions.push(indexerWatcher);

  // Listen to file/folder renames in the workspace to update cache and trigger rebuilds
  const renameListener = vscode.workspace.onDidRenameFiles(async e => {
    for (const file of e.files) {
      const oldPath = path.normalize(file.oldUri.fsPath).toLowerCase();
      const newPath = path.normalize(file.newUri.fsPath).toLowerCase();
      
      indexer.renameWorkspaceFolder(oldPath, newPath);

      // Trigger auto-rebuild if it affects a project
      const paths = ProjectService.findProjectPaths(file.newUri.fsPath);
      if (paths) {
        try {
          await DependencyService.detectAndSyncProjectDependencies(paths.workspaceDir);
          Builder.buildProject(paths.workspaceDir, paths.projectFilePath);
        } catch (err) {
          console.error(`Erro ao reconstruir projeto pós-renomeação de ${oldPath} para ${newPath}:`, err);
        }
      }
    }
  });

  // Listen to file/folder deletions in the workspace to update cache and trigger rebuilds
  const deleteListener = vscode.workspace.onDidDeleteFiles(async e => {
    for (const uri of e.files) {
      const deletedPath = path.normalize(uri.fsPath).toLowerCase();
      indexer.deleteWorkspaceFolder(deletedPath);

      // Trigger auto-rebuild if it affects a project
      const paths = ProjectService.findProjectPaths(uri.fsPath);
      if (paths) {
        try {
          await DependencyService.detectAndSyncProjectDependencies(paths.workspaceDir);
          Builder.buildProject(paths.workspaceDir, paths.projectFilePath);
        } catch (err) {
          console.error(`Erro ao reconstruir projeto pós-exclusão de ${deletedPath}:`, err);
        }
      }
    }
  });

  context.subscriptions.push(renameListener, deleteListener);

  // Initialize diagnostic service & listeners
  DiagnosticService.initialize(context);

  // Monitor when a Data7 project XML file (.7Proj) is opened to offer quick actions
  const handleProjectDocumentOpen = async (doc: vscode.TextDocument) => {
    const ext = path.extname(doc.fileName).toLowerCase();
    if (ext === '.7proj') {
      const folders = vscode.workspace.workspaceFolders;
      if (folders && folders.length > 0) {
        const workspaceDir = folders[0].uri.fsPath;
        if (workspaceDir.toLowerCase() === path.dirname(doc.fileName).toLowerCase()) {
          const configPath = path.join(workspaceDir, 'data7.json');
          if (fs.existsSync(configPath)) {
            return;
          }
        }
      }

      const choice = await vscode.window.showInformationMessage(
        `Projeto Data7 (${path.basename(doc.fileName)}) detectado. Como deseja prosseguir?`,
        'Desenvolver (Decompor no VS Code)',
        'Executar no Data7',
        'Abrir no Developer Studio',
        'Apenas Visualizar XML'
      );
      
      if (choice === 'Desenvolver (Decompor no VS Code)') {
        vscode.commands.executeCommand('data7.openProject', vscode.Uri.file(doc.fileName));
      } else if (choice === 'Executar no Data7') {
        BuildService.runProjectFileDirectly(doc.fileName);
      } else if (choice === 'Abrir no Developer Studio') {
        BuildService.openInDevStudioDirectly(doc.fileName);
      }
    }
  };

  const openProjListener = vscode.workspace.onDidOpenTextDocument(handleProjectDocumentOpen);
  context.subscriptions.push(openProjListener);
  vscode.workspace.textDocuments.forEach(handleProjectDocumentOpen);


  // Command: Open Project (Manual trigger)
  const openProjectCommand = vscode.commands.registerCommand('data7.openProject', async (uri: vscode.Uri) => {
    let targetFile = uri?.fsPath;

    if (!targetFile) {
      const selected = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: { 'Data7 Project': ['7Proj'] },
        title: 'Selecione o arquivo .7Proj do projeto para abrir'
      });
      if (selected && selected.length > 0) {
        targetFile = selected[0].fsPath;
      }
    }

    if (!targetFile) {
      return;
    }

    const projectDir = path.dirname(targetFile);
    const projectName = path.basename(targetFile, path.extname(targetFile));

    const destFolderSelection = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      title: 'Selecione a pasta de destino (Opcional - Pressione ESC para usar a pasta atual do .7Proj)'
    });

    let workspaceDir = projectDir;
    let finalProjFile = targetFile;

    if (destFolderSelection && destFolderSelection.length > 0) {
      const selectedDestDir = destFolderSelection[0].fsPath;
      workspaceDir = path.join(selectedDestDir, projectName);
      if (!fs.existsSync(workspaceDir)) {
        fs.mkdirSync(workspaceDir, { recursive: true });
      }
      finalProjFile = path.join(workspaceDir, `${projectName}.7Proj`);
      
      try {
        fs.copyFileSync(targetFile, finalProjFile);
      } catch (err: any) {
        vscode.window.showErrorMessage(`Falha ao copiar o arquivo .7Proj para a nova pasta: ${err.message}`);
        return;
      }
    }

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Abrindo projeto '${projectName}'...`,
      cancellable: false
    }, async () => {
      try {
        const repoBasPath = RepositoryService.getRepoBasPath();
        
        let knownSharedModules: Set<string> | undefined;
        if (repoBasPath && fs.existsSync(repoBasPath)) {
          try {
            const sharedModules = DependencyScanner.scanSharedModules(repoBasPath);
            knownSharedModules = new Set(sharedModules.keys());
          } catch {}
        }

        Decompiler.decompileProject(finalProjFile, workspaceDir, knownSharedModules);

        await ProjectService.protectProjectFolder(workspaceDir);

        let syncedCount = 0;
        if (repoBasPath && fs.existsSync(repoBasPath)) {
          const synced = await DependencyService.detectAndSyncProjectDependencies(workspaceDir);
          syncedCount = synced.length;
        }

        vscode.window.showInformationMessage(
          `Projeto '${projectName}' aberto com sucesso. ` +
          (syncedCount > 0 ? `${syncedCount} dependências sincronizadas.` : '')
        );

        const folderUri = vscode.Uri.file(workspaceDir);
        await vscode.commands.executeCommand('vscode.openFolder', folderUri, { forceNewWindow: false });
      } catch (err: any) {
        vscode.window.showErrorMessage(`Erro ao abrir o projeto: ${err.message}`);
      }
    });
  });

  const decomposeCommand = vscode.commands.registerCommand('data7.decompose', (uri) => {
    return vscode.commands.executeCommand('data7.openProject', uri);
  });

  const newProjectCommand = vscode.commands.registerCommand('data7.newProject', () => ProjectService.createNewProject());
  const openDevStudioCommand = vscode.commands.registerCommand('data7.openDevStudio', () => BuildService.openInDevStudio());
  const buildCommand = vscode.commands.registerCommand('data7.build', () => BuildService.build());
  const runCommand = vscode.commands.registerCommand('data7.runProject', () => BuildService.run());
  const installModuleCommand = vscode.commands.registerCommand('data7.installModule', () => DependencyService.installModule());
  const updateDependenciesCommand = vscode.commands.registerCommand('data7.updateDependencies', () => DependencyService.updateDependencies());
  const importModuleCommand = vscode.commands.registerCommand('data7.importModuleToRepository', () => RepositoryService.importModuleToRepository());
  const bulkImportCommand = vscode.commands.registerCommand('data7.bulkImportToRepository', () => RepositoryService.bulkImportToRepository());
  const exploreRepoCommand = vscode.commands.registerCommand('data7.exploreRepository', () => RepositoryService.exploreRepository());

  const openParentCommand = vscode.commands.registerCommand('data7.openParentFolder', async () => {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      const workspaceDir = folders[0].uri.fsPath;
      const configPath = path.join(workspaceDir, 'data7.json');
      if (fs.existsSync(configPath)) {
        const parentDir = path.dirname(workspaceDir);
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(parentDir), { forceNewWindow: false });
      }
    }
  });

  context.subscriptions.push(
    openProjectCommand, 
    decomposeCommand, 
    newProjectCommand, 
    openDevStudioCommand, 
    buildCommand, 
    runCommand,
    installModuleCommand,
    updateDependenciesCommand,
    importModuleCommand,
    bulkImportCommand,
    exploreRepoCommand,
    openParentCommand
  );

  // Initialize and check current workspace folder configuration
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    const workspaceDir = folders[0].uri.fsPath;
    const configPath = path.join(workspaceDir, 'data7.json');

    if (fs.existsSync(configPath)) {
      DependencyService.detectAndSyncProjectDependencies(workspaceDir).catch(err => {
        console.error('Erro na detecção de dependências na inicialização:', err);
      });

      let projectFilePath: string | undefined;
      try {
        const files = fs.readdirSync(workspaceDir);
        const projFile = files.find(f => f.toLowerCase().endsWith('.7proj'));
        if (projFile) {
          projectFilePath = path.join(workspaceDir, projFile);
        }
      } catch {}

      if (!projectFilePath) {
        try {
          const meta = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          const projName = meta.nome || path.basename(workspaceDir);
          projectFilePath = path.join(workspaceDir, `${projName}.7Proj`);
        } catch {
          projectFilePath = path.join(workspaceDir, `${path.basename(workspaceDir)}.7Proj`);
        }
      }

      ProjectService.verifyProjectConnection(workspaceDir, projectFilePath);
      
      if (projectFilePath && fs.existsSync(projectFilePath)) {
        SyncWatcher.watchExternalProjectFile(projectFilePath, workspaceDir);
      }

      const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
      statusBarItem.command = 'data7.openParentFolder';
      statusBarItem.text = '$(arrow-left) Voltar para Repositório';
      statusBarItem.tooltip = 'Clique para voltar para a pasta de projetos principal';
      statusBarItem.show();
      context.subscriptions.push(statusBarItem);

      const principalPath = path.join(workspaceDir, 'src', 'Principal.bas');
      if (fs.existsSync(principalPath) && vscode.window.visibleTextEditors.length === 0) {
        vscode.workspace.openTextDocument(principalPath).then(doc => {
          vscode.window.showTextDocument(doc);
        });
      }
    }
  }

  // Setup Bidirectional Auto Sync watcher
  SyncWatcher.startAutoSync(context);

  // Auto-detect .7Proj files in workspace to suggest opening them
  async function detectAndPromptProjFiles() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return;
    }

    const workspaceDir = folders[0].uri.fsPath;
    const configPath = path.join(workspaceDir, 'data7.json');
    if (fs.existsSync(configPath)) {
      return;
    }

    try {
      const files = fs.readdirSync(workspaceDir);
      const projFiles = files.filter(f => f.toLowerCase().endsWith('.7proj'));
      
      if (projFiles.length > 0) {
        const message = `Projetos Data7 (.7Proj) detectados nesta pasta. Deseja abrir um projeto com a extensão?`;
        const selectAction = 'Sim';
        const choice = await vscode.window.showInformationMessage(message, selectAction, 'Não');
        
        if (choice === selectAction) {
          let selectedProj = projFiles[0];
          if (projFiles.length > 1) {
            const pick = await vscode.window.showQuickPick(projFiles, {
              placeHolder: 'Selecione o projeto Data7 para abrir:',
              ignoreFocusOut: true
            });
            if (!pick) { return; }
            selectedProj = pick;
          }
          const fullPath = path.join(workspaceDir, selectedProj);
          vscode.commands.executeCommand('data7.openProject', vscode.Uri.file(fullPath));
        }
      }
    } catch (err) {
      console.error('Erro ao buscar arquivos .7Proj no workspace:', err);
    }
  }

  setTimeout(detectAndPromptProjFiles, 1500);

  // Register LSP providers
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    'd7basic',
    new D7BasicCompletionProvider(),
    '.'
  );

  const definitionProvider = vscode.languages.registerDefinitionProvider(
    'd7basic',
    new D7BasicDefinitionProvider()
  );

  const hoverProvider = vscode.languages.registerHoverProvider(
    'd7basic',
    new D7BasicHoverProvider()
  );

  const signatureProvider = vscode.languages.registerSignatureHelpProvider(
    'd7basic',
    new D7BasicSignatureHelpProvider(),
    '(',
    ','
  );

  const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
    'd7basic',
    new D7BasicFormattingProvider()
  );

  const codeActionsProvider = vscode.languages.registerCodeActionsProvider(
    'd7basic',
    new D7BasicCodeActionProvider(),
    {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
    }
  );

  context.subscriptions.push(
    completionProvider,
    definitionProvider,
    hoverProvider,
    signatureProvider,
    formattingProvider,
    codeActionsProvider
  );
}

export function deactivate() {
  SyncWatcher.dispose();
  console.log('Extensão Data7 Dev Studio desativada.');
}
