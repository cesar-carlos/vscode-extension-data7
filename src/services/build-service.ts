import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { Builder } from '../builder';
import { DependencyScanner } from '../dependency-scanner';
import { ProjectService } from './project-service';
import { RepositoryService } from './repository-service';
import { DependencyService } from './dependency-service';

export class BuildService {
  /**
   * Run compilation/rebuild on the active project
   */
  public static async build() {
    const project = ProjectService.getActiveProject();
    if (!project) {
      vscode.window.showErrorMessage('Nenhum projeto Data7 ativo detectado na IDE. Abra um arquivo .bas de um projeto para compilar.');
      return;
    }

    const repoBasPath = RepositoryService.getRepoBasPath();

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Compilando e empacotando projeto...',
      cancellable: false
    }, async () => {
      try {
        const srcDir = path.join(project.workspaceDir, 'src');
        const data7ModulesDir = path.join(project.workspaceDir, 'data7_modules');

        let dependencies = {};
        const configJsonPath = path.join(project.workspaceDir, 'data7.json');
        if (fs.existsSync(configJsonPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
            dependencies = meta.dependencies || {};
          } catch {}
        }

        // 1. Sync dependencies first
        DependencyScanner.syncDependencies(srcDir, data7ModulesDir, repoBasPath, dependencies);

        // 2. Compile/rebuild
        Builder.buildProject(project.workspaceDir, project.projectFilePath);
        vscode.window.showInformationMessage(`Projeto compilado com sucesso em: ${project.projectFilePath}`);
      } catch (err: any) {
        vscode.window.showErrorMessage(`Erro ao compilar: ${err.message}`);
      }
    });
  }

  /**
   * Run the project (F5 execution)
   */
  public static async run() {
    const project = ProjectService.getActiveProject();
    if (!project) {
      vscode.window.showErrorMessage('Nenhum projeto Data7 ativo detectado para executar. Abra um arquivo .bas do projeto.');
      return;
    }

    const config = vscode.workspace.getConfiguration('data7');
    const executorPath = await ProjectService.ensureExecutorPath(config);
    if (!executorPath) {
      vscode.window.showErrorMessage('Execução cancelada. O caminho do Executor.exe é obrigatório.');
      return;
    }

    const repoBasPath = RepositoryService.getRepoBasPath();

    const userCode = config.get<number>('userCode') || 1;
    const companyCode = config.get<number>('companyCode') || 1;
    const branchCode = config.get<number>('branchCode') || 1;
    let connectionId = config.get<string>('databaseConnectionId') || '';

    let dbIdFromProject = '';
    let dependencies = {};
    const configJsonPath = path.join(project.workspaceDir, 'data7.json');
    if (fs.existsSync(configJsonPath)) {
      try {
        const projMeta = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
        dbIdFromProject = projMeta.opcoes?.identificacaoBancoDados || '';
        dependencies = projMeta.dependencies || {};
      } catch {}
    }

    if (!connectionId) {
      connectionId = dbIdFromProject;
    }
    if (!connectionId) {
      const input = await vscode.window.showInputBox({
        prompt: 'Informe o ID de conexão com o banco de dados (UUID-CONEXAO):',
        placeHolder: 'Ex: 05B54E6D-D75B-4A7F-9943-5521A91747C9',
        ignoreFocusOut: true
      });
      if (input) {
        connectionId = input;
        await config.update('databaseConnectionId', connectionId, vscode.ConfigurationTarget.Workspace);
      } else {
        vscode.window.showErrorMessage('ID de conexão do banco de dados é obrigatório para execução.');
        return;
      }
    }

    try {
      const srcDir = path.join(project.workspaceDir, 'src');
      const data7ModulesDir = path.join(project.workspaceDir, 'data7_modules');
      DependencyScanner.syncDependencies(srcDir, data7ModulesDir, repoBasPath, dependencies);
      Builder.buildProject(project.workspaceDir, project.projectFilePath);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Falha na compilação antes de executar: ${err.message}`);
      return;
    }

    this.runProjectFileDirectly(project.projectFilePath);
  }

  /**
   * Run project file directly with the executor path
   */
  public static async runProjectFileDirectly(projectFilePath: string) {
    const config = vscode.workspace.getConfiguration('data7');
    const executorPath = await ProjectService.ensureExecutorPath(config);
    if (!executorPath) {
      vscode.window.showErrorMessage('Execução cancelada. O caminho do Executor.exe é obrigatório.');
      return;
    }

    const userCode = config.get<number>('userCode') || 1;
    const companyCode = config.get<number>('companyCode') || 1;
    const branchCode = config.get<number>('branchCode') || 1;
    let connectionId = config.get<string>('databaseConnectionId') || '';

    if (!connectionId) {
      const input = await vscode.window.showInputBox({
        prompt: 'Informe o ID de conexão com o banco de dados (UUID-CONEXAO):',
        placeHolder: 'Ex: 05B54E6D-D75B-4A7F-9943-5521A91747C9',
        ignoreFocusOut: true
      });
      if (input) {
        connectionId = input;
        await config.update('databaseConnectionId', connectionId, vscode.ConfigurationTarget.Workspace);
      } else {
        vscode.window.showErrorMessage('ID de conexão do banco de dados é obrigatório para execução.');
        return;
      }
    }

    const terminalName = 'Data7 Executor';
    let terminal = vscode.window.terminals.find(t => t.name === terminalName);
    if (!terminal) {
      terminal = vscode.window.createTerminal(terminalName);
    }

    const execCmd = `"${executorPath}" -p "${projectFilePath}" -U ${userCode} -E ${companyCode} -F ${branchCode} -C "${connectionId}"`;
    
    terminal.show();
    terminal.sendText(execCmd);
  }

  /**
   * Open active project in developer studio
   */
  public static async openInDevStudio() {
    const project = ProjectService.getActiveProject();
    if (!project) {
      vscode.window.showErrorMessage('Nenhum projeto Data7 ativo detectado na IDE.');
      return;
    }

    const config = vscode.workspace.getConfiguration('data7');
    const executorPath = config.get<string>('executorPath') || '';
    if (!executorPath || !fs.existsSync(executorPath)) {
      vscode.window.showErrorMessage('Caminho do Executor.exe não configurado ou inválido nas configurações.');
      return;
    }

    try {
      const srcDir = path.join(project.workspaceDir, 'src');
      const data7ModulesDir = path.join(project.workspaceDir, 'data7_modules');
      
      let dependencies = {};
      const configJsonPath = path.join(project.workspaceDir, 'data7.json');
      if (fs.existsSync(configJsonPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
          dependencies = meta.dependencies || {};
        } catch {}
      }
      
      const repoBasPath = RepositoryService.getRepoBasPath();
      if (repoBasPath && fs.existsSync(repoBasPath)) {
        DependencyScanner.syncDependencies(srcDir, data7ModulesDir, repoBasPath, dependencies);
      }
      
      Builder.buildProject(project.workspaceDir, project.projectFilePath);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Falha ao compilar o projeto antes de abrir no Developer Studio: ${err.message}`);
      return;
    }

    this.openInDevStudioDirectly(project.projectFilePath);
  }

  /**
   * Open .7Proj directly inside developer studio
   */
  public static async openInDevStudioDirectly(projectFilePath: string) {
    const config = vscode.workspace.getConfiguration('data7');
    const executorPath = config.get<string>('executorPath') || '';
    if (!executorPath || !fs.existsSync(executorPath)) {
      vscode.window.showErrorMessage('Caminho do Executor.exe não configurado ou inválido nas configurações.');
      return;
    }

    const executorDir = path.dirname(executorPath);
    const devStudioPath = path.join(executorDir, 'DevStudio.exe');

    if (!fs.existsSync(devStudioPath)) {
      vscode.window.showErrorMessage(`DevStudio.exe não foi encontrado na pasta "${executorDir}".`);
      return;
    }

    vscode.window.showInformationMessage(`Abrindo "${path.basename(projectFilePath)}" no Developer Studio...`);

    const child = exec(`"${devStudioPath}" "${projectFilePath}"`, (err) => {
      if (err) {
        vscode.window.showErrorMessage(`Erro ao executar o Developer Studio: ${err.message}`);
      }
    });
    child.unref();
  }
}
