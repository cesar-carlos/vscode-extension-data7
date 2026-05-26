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
exports.BuildService = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const builder_1 = require("../builder");
const dependency_scanner_1 = require("../dependency-scanner");
const project_service_1 = require("./project-service");
const repository_service_1 = require("./repository-service");
class BuildService {
    /**
     * Run compilation/rebuild on the active project
     */
    static async build() {
        const project = project_service_1.ProjectService.getActiveProject();
        if (!project) {
            vscode.window.showErrorMessage('Nenhum projeto Data7 ativo detectado na IDE. Abra um arquivo .bas de um projeto para compilar.');
            return;
        }
        const repoBasPath = repository_service_1.RepositoryService.getRepoBasPath();
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
                    }
                    catch { }
                }
                // 1. Sync dependencies first
                dependency_scanner_1.DependencyScanner.syncDependencies(srcDir, data7ModulesDir, repoBasPath, dependencies);
                // 2. Compile/rebuild
                builder_1.Builder.buildProject(project.workspaceDir, project.projectFilePath);
                vscode.window.showInformationMessage(`Projeto compilado com sucesso em: ${project.projectFilePath}`);
            }
            catch (err) {
                vscode.window.showErrorMessage(`Erro ao compilar: ${err.message}`);
            }
        });
    }
    /**
     * Run the project (F5 execution)
     */
    static async run() {
        const project = project_service_1.ProjectService.getActiveProject();
        if (!project) {
            vscode.window.showErrorMessage('Nenhum projeto Data7 ativo detectado para executar. Abra um arquivo .bas do projeto.');
            return;
        }
        const config = vscode.workspace.getConfiguration('data7');
        const executorPath = await project_service_1.ProjectService.ensureExecutorPath(config);
        if (!executorPath) {
            vscode.window.showErrorMessage('Execução cancelada. O caminho do Executor.exe é obrigatório.');
            return;
        }
        const repoBasPath = repository_service_1.RepositoryService.getRepoBasPath();
        const userCode = config.get('userCode') || 1;
        const companyCode = config.get('companyCode') || 1;
        const branchCode = config.get('branchCode') || 1;
        let connectionId = config.get('databaseConnectionId') || '';
        let dbIdFromProject = '';
        let dependencies = {};
        const configJsonPath = path.join(project.workspaceDir, 'data7.json');
        if (fs.existsSync(configJsonPath)) {
            try {
                const projMeta = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
                dbIdFromProject = projMeta.opcoes?.identificacaoBancoDados || '';
                dependencies = projMeta.dependencies || {};
            }
            catch { }
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
            }
            else {
                vscode.window.showErrorMessage('ID de conexão do banco de dados é obrigatório para execução.');
                return;
            }
        }
        try {
            const srcDir = path.join(project.workspaceDir, 'src');
            const data7ModulesDir = path.join(project.workspaceDir, 'data7_modules');
            dependency_scanner_1.DependencyScanner.syncDependencies(srcDir, data7ModulesDir, repoBasPath, dependencies);
            builder_1.Builder.buildProject(project.workspaceDir, project.projectFilePath);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Falha na compilação antes de executar: ${err.message}`);
            return;
        }
        this.runProjectFileDirectly(project.projectFilePath);
    }
    /**
     * Run project file directly with the executor path
     */
    static async runProjectFileDirectly(projectFilePath) {
        const config = vscode.workspace.getConfiguration('data7');
        const executorPath = await project_service_1.ProjectService.ensureExecutorPath(config);
        if (!executorPath) {
            vscode.window.showErrorMessage('Execução cancelada. O caminho do Executor.exe é obrigatório.');
            return;
        }
        const userCode = config.get('userCode') || 1;
        const companyCode = config.get('companyCode') || 1;
        const branchCode = config.get('branchCode') || 1;
        let connectionId = config.get('databaseConnectionId') || '';
        if (!connectionId) {
            const input = await vscode.window.showInputBox({
                prompt: 'Informe o ID de conexão com o banco de dados (UUID-CONEXAO):',
                placeHolder: 'Ex: 05B54E6D-D75B-4A7F-9943-5521A91747C9',
                ignoreFocusOut: true
            });
            if (input) {
                connectionId = input;
                await config.update('databaseConnectionId', connectionId, vscode.ConfigurationTarget.Workspace);
            }
            else {
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
    static async openInDevStudio() {
        const project = project_service_1.ProjectService.getActiveProject();
        if (!project) {
            vscode.window.showErrorMessage('Nenhum projeto Data7 ativo detectado na IDE.');
            return;
        }
        const config = vscode.workspace.getConfiguration('data7');
        const executorPath = config.get('executorPath') || '';
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
                }
                catch { }
            }
            const repoBasPath = repository_service_1.RepositoryService.getRepoBasPath();
            if (repoBasPath && fs.existsSync(repoBasPath)) {
                dependency_scanner_1.DependencyScanner.syncDependencies(srcDir, data7ModulesDir, repoBasPath, dependencies);
            }
            builder_1.Builder.buildProject(project.workspaceDir, project.projectFilePath);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Falha ao compilar o projeto antes de abrir no Developer Studio: ${err.message}`);
            return;
        }
        this.openInDevStudioDirectly(project.projectFilePath);
    }
    /**
     * Open .7Proj directly inside developer studio
     */
    static async openInDevStudioDirectly(projectFilePath) {
        const config = vscode.workspace.getConfiguration('data7');
        const executorPath = config.get('executorPath') || '';
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
        const child = (0, child_process_1.exec)(`"${devStudioPath}" "${projectFilePath}"`, (err) => {
            if (err) {
                vscode.window.showErrorMessage(`Erro ao executar o Developer Studio: ${err.message}`);
            }
        });
        child.unref();
    }
}
exports.BuildService = BuildService;
//# sourceMappingURL=build-service.js.map