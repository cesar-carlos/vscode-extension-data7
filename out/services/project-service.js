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
exports.ProjectService = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const fast_xml_parser_1 = require("fast-xml-parser");
const builder_1 = require("../builder");
class ProjectService {
    /**
     * Parse a file path to identify if it belongs to a Data7 project folder
     * Returns the project workspace directory and the target .7Proj file path
     */
    static findProjectPaths(filePath) {
        let currentDir = path.dirname(filePath);
        const root = path.parse(currentDir).root;
        while (currentDir && currentDir !== root) {
            const configPath = path.join(currentDir, 'data7.json');
            if (fs.existsSync(configPath)) {
                try {
                    const files = fs.readdirSync(currentDir);
                    const projFile = files.find(f => f.toLowerCase().endsWith('.7proj'));
                    if (projFile) {
                        return {
                            workspaceDir: currentDir,
                            projectFilePath: path.join(currentDir, projFile)
                        };
                    }
                    else {
                        const meta = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                        const projName = meta.nome || path.basename(currentDir);
                        return {
                            workspaceDir: currentDir,
                            projectFilePath: path.join(currentDir, `${projName}.7Proj`)
                        };
                    }
                }
                catch {
                    const projName = path.basename(currentDir);
                    return {
                        workspaceDir: currentDir,
                        projectFilePath: path.join(currentDir, `${projName}.7Proj`)
                    };
                }
            }
            currentDir = path.dirname(currentDir);
        }
        return undefined;
    }
    /**
     * Get the active project details based on the currently open editor file or active workspace
     */
    static getActiveProject() {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const paths = this.findProjectPaths(activeEditor.document.fileName);
            if (paths) {
                return paths;
            }
        }
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            const workspaceDir = folders[0].uri.fsPath;
            const configPath = path.join(workspaceDir, 'data7.json');
            if (fs.existsSync(configPath)) {
                try {
                    const files = fs.readdirSync(workspaceDir);
                    const projFile = files.find(f => f.toLowerCase().endsWith('.7proj'));
                    if (projFile) {
                        return {
                            workspaceDir,
                            projectFilePath: path.join(workspaceDir, projFile)
                        };
                    }
                    else {
                        const meta = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                        const projName = meta.nome || path.basename(workspaceDir);
                        return {
                            workspaceDir,
                            projectFilePath: path.join(workspaceDir, `${projName}.7Proj`)
                        };
                    }
                }
                catch {
                    const projName = path.basename(workspaceDir);
                    return {
                        workspaceDir,
                        projectFilePath: path.join(workspaceDir, `${projName}.7Proj`)
                    };
                }
            }
        }
        return undefined;
    }
    /**
     * Configuration helper to ensure Executor.exe path is configured
     */
    static async ensureExecutorPath(config) {
        let executorPath = config.get('executorPath') || '';
        if (!executorPath || executorPath.includes('[Executor.exe') || !fs.existsSync(executorPath)) {
            const selected = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: { 'Executáveis': ['exe'] },
                title: 'Selecione o arquivo do Executor do Data7 (Executor.exe)'
            });
            if (selected && selected.length > 0) {
                executorPath = selected[0].fsPath;
                await config.update('executorPath', executorPath, vscode.ConfigurationTarget.Global);
            }
            else {
                return undefined;
            }
        }
        return executorPath;
    }
    /**
     * Helper to set up gitignore for standard project workspace
     */
    static async protectProjectFolder(workspaceDir) {
        const gitignorePath = path.join(workspaceDir, '.gitignore');
        if (!fs.existsSync(gitignorePath)) {
            fs.writeFileSync(gitignorePath, `# Módulos de dependências do Data7\ndata7_modules/\n`, 'utf-8');
        }
        else {
            try {
                const content = fs.readFileSync(gitignorePath, 'utf-8');
                if (!content.includes('data7_modules/')) {
                    fs.appendFileSync(gitignorePath, `\n# Módulos de dependências do Data7\ndata7_modules/\n`, 'utf-8');
                }
            }
            catch { }
        }
    }
    /**
     * Load available database connections from config
     */
    static loadAvailableConnections() {
        const config = vscode.workspace.getConfiguration('data7');
        const executorPath = config.get('executorPath') || '';
        let executorDir = '';
        if (executorPath && !executorPath.includes('[Executor.exe') && fs.existsSync(executorPath)) {
            executorDir = path.dirname(executorPath);
        }
        else {
            const fallbackDir = 'C:\\Data7\\bin';
            if (fs.existsSync(fallbackDir)) {
                executorDir = fallbackDir;
            }
        }
        if (!executorDir) {
            console.log('Pasta do executor do Data7 não encontrada ou não configurada.');
            return [];
        }
        let configFile = path.join(executorDir, 'dataset.config');
        if (!fs.existsSync(configFile)) {
            configFile = path.join(executorDir, 'Data7.Config');
        }
        if (!fs.existsSync(configFile)) {
            console.log(`Nenhum arquivo de configuração de conexões encontrado em ${executorDir}`);
            return [];
        }
        try {
            const xml = fs.readFileSync(configFile, 'utf-8');
            const parser = new fast_xml_parser_1.XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: '@_'
            });
            const parsed = parser.parse(xml);
            const root = parsed.Configurações || parsed.Configuracoes || parsed;
            if (!root) {
                return [];
            }
            const items = root.Item;
            if (!items) {
                return [];
            }
            const itemList = Array.isArray(items) ? items : [items];
            const connections = [];
            for (const item of itemList) {
                const id = item['@_ID'] || item.ID;
                const desc = item.Descrição || item.Descricao || '';
                if (id) {
                    connections.push({
                        id: String(id).trim(),
                        desc: String(desc).trim()
                    });
                }
            }
            return connections;
        }
        catch (err) {
            console.error('Erro ao ler conexões de banco de dados no arquivo:', configFile, err);
            return [];
        }
    }
    /**
     * Verify and prompt for project database connection
     */
    static async verifyProjectConnection(workspaceDir, projectFilePath) {
        const configJsonPath = path.join(workspaceDir, 'data7.json');
        if (!fs.existsSync(configJsonPath)) {
            return;
        }
        const connections = this.loadAvailableConnections();
        if (connections.length === 0) {
            return;
        }
        let projectMeta;
        try {
            projectMeta = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
        }
        catch (err) {
            console.error('Erro ao ler data7.json:', err);
            return;
        }
        const currentDbId = (projectMeta.opcoes?.identificacaoBancoDados || '').trim().toLowerCase();
        const isValid = connections.some(conn => conn.id.toLowerCase() === currentDbId);
        if (!isValid) {
            const quickPickItems = connections.map(conn => ({
                label: conn.desc,
                description: conn.id,
                detail: `ID: ${conn.id}`
            }));
            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Selecione a conexão do banco de dados para este projeto (necessário para rodar/buildar)',
                ignoreFocusOut: true
            });
            if (selected) {
                if (!projectMeta.opcoes) {
                    projectMeta.opcoes = {};
                }
                projectMeta.opcoes.identificacaoBancoDados = selected.description;
                try {
                    fs.writeFileSync(configJsonPath, JSON.stringify(projectMeta, null, 2), 'utf-8');
                    builder_1.Builder.buildProject(workspaceDir, projectFilePath);
                    vscode.window.showInformationMessage(`Conexão com banco de dados atualizada para "${selected.label}" no projeto.`);
                }
                catch (err) {
                    vscode.window.showErrorMessage(`Erro ao atualizar conexão do projeto: ${err.message}`);
                }
            }
            else {
                vscode.window.showWarningMessage('Nenhuma conexão com banco de dados foi selecionada. O projeto pode estar com ID inválido ou em branco.');
            }
        }
    }
    /**
     * Create a new Data7 Project
     */
    static async createNewProject() {
        const projectName = await vscode.window.showInputBox({
            prompt: 'Digite o nome do novo projeto:',
            placeHolder: 'Ex: mod_logger',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim() === '') {
                    return 'O nome do projeto é obrigatório.';
                }
                if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    return 'O nome do projeto deve conter apenas letras, números e sublinhados (_).';
                }
                return null;
            }
        });
        if (!projectName) {
            return;
        }
        const parentFolderSelection = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            title: 'Selecione a pasta mãe onde a pasta do projeto será criada'
        });
        if (!parentFolderSelection || parentFolderSelection.length === 0) {
            return;
        }
        const parentDir = parentFolderSelection[0].fsPath;
        const projectDir = path.join(parentDir, projectName);
        if (fs.existsSync(projectDir)) {
            vscode.window.showErrorMessage(`A pasta do projeto "${projectName}" já existe em "${parentDir}".`);
            return;
        }
        const language = await vscode.window.showQuickPick(['Basic', 'C#'], {
            placeHolder: 'Selecione a linguagem do projeto:',
            ignoreFocusOut: true
        });
        if (!language) {
            return;
        }
        const version = await vscode.window.showInputBox({
            prompt: 'Digite a versão inicial do projeto:',
            value: '1.0.0.0',
            ignoreFocusOut: true
        });
        if (!version) {
            return;
        }
        const author = await vscode.window.showInputBox({
            prompt: 'Digite o nome do Autor:',
            value: 'Administrador',
            ignoreFocusOut: true
        }) || 'Administrador';
        const companyCodeStr = await vscode.window.showInputBox({
            prompt: 'Digite o código da Empresa:',
            value: '1',
            ignoreFocusOut: true
        }) || '1';
        const companyCode = parseInt(companyCodeStr, 10) || 1;
        const branchCodeStr = await vscode.window.showInputBox({
            prompt: 'Digite o código da Filial:',
            value: '1',
            ignoreFocusOut: true
        }) || '1';
        const branchCode = parseInt(branchCodeStr, 10) || 1;
        const connectionId = await vscode.window.showInputBox({
            prompt: 'Digite a identificação de Conexão com Banco de Dados (Opcional):',
            placeHolder: 'Ex: UUID-CONEXAO',
            ignoreFocusOut: true
        }) || '';
        try {
            fs.mkdirSync(projectDir, { recursive: true });
            const srcDir = path.join(projectDir, 'src');
            fs.mkdirSync(srcDir, { recursive: true });
            const defaultBasCode = `' Código Principal do Projeto: ${projectName}\r\nImports Collections\r\n\r\n' Ponto de entrada do script\r\n`;
            fs.writeFileSync(path.join(srcDir, 'Principal.bas'), defaultBasCode, 'utf-8');
            const generateGuid = () => {
                const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1).toUpperCase();
                return `{${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}}`;
            };
            const firstFolderId = generateGuid();
            const configData = {
                nome: projectName,
                language: language,
                version: version,
                targetPlatform: 'Default',
                opcoes: {
                    autor: author,
                    versao: version,
                    informacoes: `Projeto ${projectName} criado no VS Code`,
                    codEmpresa: companyCode,
                    codFilial: branchCode,
                    nomeUsuario: author,
                    preScript: "",
                    identificacaoBancoDados: connectionId
                },
                virtualFolders: [
                    {
                        nome: "Unidades (1)",
                        id: firstFolderId,
                        pastaId: "",
                        aberta: "Sim"
                    }
                ],
                modulesMetadata: {},
                dependencies: {}
            };
            fs.writeFileSync(path.join(projectDir, 'data7.json'), JSON.stringify(configData, null, 2), 'utf-8');
            await this.protectProjectFolder(projectDir);
            const projectFilePath = path.join(projectDir, `${projectName}.7Proj`);
            builder_1.Builder.buildProject(projectDir, projectFilePath);
            vscode.window.showInformationMessage(`Projeto "${projectName}" criado com sucesso!`);
            const folderUri = vscode.Uri.file(projectDir);
            await vscode.commands.executeCommand('vscode.openFolder', folderUri, { forceNewWindow: false });
        }
        catch (err) {
            vscode.window.showErrorMessage(`Falha ao criar o novo projeto: ${err.message}`);
        }
    }
}
exports.ProjectService = ProjectService;
//# sourceMappingURL=project-service.js.map