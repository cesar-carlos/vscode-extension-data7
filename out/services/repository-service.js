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
exports.RepositoryService = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const fast_xml_parser_1 = require("fast-xml-parser");
const context_1 = require("./context");
const dependency_scanner_1 = require("../dependency-scanner");
class RepositoryService {
    /**
     * Returns the exclusive repository path for decompiled .bas modules
     */
    static getRepoBasPath() {
        const storagePath = context_1.ExtensionContextHolder.getStoragePath();
        if (!storagePath) {
            // Fallback safe path for unit tests or before activation
            const fallback = path.join(os.homedir(), '.data7_extension', 'repository');
            if (!fs.existsSync(fallback)) {
                fs.mkdirSync(fallback, { recursive: true });
            }
            return fallback;
        }
        const repoBasPath = path.join(storagePath, 'repository');
        if (!fs.existsSync(repoBasPath)) {
            fs.mkdirSync(repoBasPath, { recursive: true });
        }
        return repoBasPath;
    }
    /**
     * Helper to decode HTML entities in XML code nodes
     */
    static decodeHtmlEntities(str) {
        if (typeof str !== 'string') {
            return '';
        }
        return str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
    }
    /**
     * Configuration helper to ensure Shared Modules path is configured
     */
    static async ensureSharedModulesPath(config) {
        let sharedModulesPath = config.get('sharedModulesPath') || '';
        if (!sharedModulesPath || !fs.existsSync(sharedModulesPath)) {
            const selected = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                title: 'Selecione a pasta que contém os Módulos Compartilhados (.bas ou .7Proj)'
            });
            if (selected && selected.length > 0) {
                sharedModulesPath = selected[0].fsPath;
                await config.update('sharedModulesPath', sharedModulesPath, vscode.ConfigurationTarget.Global);
            }
            else {
                return undefined;
            }
        }
        return sharedModulesPath;
    }
    /**
     * Import a single module file (.bas or from .7Proj) into the private repository
     */
    static async importModuleToRepository() {
        const repoBasPath = this.getRepoBasPath();
        const config = vscode.workspace.getConfiguration('data7');
        const sharedModulesDir = config.get('sharedModulesPath') || '';
        const defaultUri = sharedModulesDir && fs.existsSync(sharedModulesDir) ? vscode.Uri.file(sharedModulesDir) : undefined;
        // 1. Select source file
        const selectedFiles = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            defaultUri,
            filters: { 'Data7 Modules/Projects': ['bas', '7proj', '7Proj'] },
            title: 'Selecione o arquivo de origem (.bas ou .7Proj) para importar'
        });
        if (!selectedFiles || selectedFiles.length === 0) {
            return;
        }
        const sourceFile = selectedFiles[0].fsPath;
        const ext = path.extname(sourceFile).toLowerCase();
        if (ext === '.bas') {
            try {
                const content = fs.readFileSync(sourceFile, 'utf-8');
                const contentLower = content.toLowerCase();
                const isModule = contentLower.includes('@module') && !contentLower.includes('@module-imported');
                if (!isModule) {
                    vscode.window.showWarningMessage('O arquivo selecionado não possui a flag @Module ou contém @Module-Imported. Importação não permitida.');
                    return;
                }
                const filename = path.basename(sourceFile, '.bas');
                const nsMatch = content.match(/\bNamespace\s+([a-zA-Z0-9_]+)/i);
                const modName = nsMatch ? nsMatch[1] : filename;
                const destPath = path.join(repoBasPath, `${modName}.bas`);
                fs.writeFileSync(destPath, content, 'utf-8');
                vscode.window.showInformationMessage(`Módulo "${modName}" importado com sucesso para o repositório.`);
            }
            catch (err) {
                vscode.window.showErrorMessage(`Erro ao importar arquivo .bas: ${err.message}`);
            }
        }
        else if (ext === '.7proj') {
            try {
                const xmlContent = fs.readFileSync(sourceFile, 'utf-8');
                const parser = new fast_xml_parser_1.XMLParser({
                    ignoreAttributes: true,
                    parseTagValue: false
                });
                const parsed = parser.parse(xmlContent);
                const root = parsed.Projeto_Data7;
                if (!root || !root.Modulos) {
                    vscode.window.showErrorMessage('Nenhum módulo encontrado no arquivo .7Proj selecionado.');
                    return;
                }
                const modulosContainer = root.Modulos;
                const modNames = Object.keys(modulosContainer).filter(name => {
                    if (name.startsWith('#') || name.startsWith('@_')) {
                        return false;
                    }
                    const mod = modulosContainer[name];
                    const code = (mod.Codigo || '').toLowerCase();
                    return code.includes('@module') && !code.includes('@module-imported');
                });
                if (modNames.length === 0) {
                    vscode.window.showErrorMessage('Nenhum módulo válido com a flag @Module (e sem @Module-Imported) encontrado na tag <Modulos>.');
                    return;
                }
                const pick = await vscode.window.showQuickPick(modNames, {
                    placeHolder: 'Selecione o(s) módulo(s) para importar para o repositório:',
                    canPickMany: true,
                    ignoreFocusOut: true
                });
                if (!pick || pick.length === 0) {
                    return;
                }
                let count = 0;
                pick.forEach(modName => {
                    const mod = modulosContainer[modName];
                    const rawCode = mod.Codigo || '';
                    const decodedCode = this.decodeHtmlEntities(rawCode);
                    const destPath = path.join(repoBasPath, `${modName}.bas`);
                    fs.writeFileSync(destPath, decodedCode, 'utf-8');
                    count++;
                });
                vscode.window.showInformationMessage(`${count} módulo(s) importados com sucesso para o repositório.`);
            }
            catch (err) {
                vscode.window.showErrorMessage(`Erro ao processar arquivo .7Proj: ${err.message}`);
            }
        }
    }
    /**
     * Scan folder for modules and bulk import selected items to exclusive repository
     */
    static async bulkImportToRepository() {
        const repoBasPath = this.getRepoBasPath();
        const config = vscode.workspace.getConfiguration('data7');
        const sharedModulesDir = config.get('sharedModulesPath') || '';
        const defaultUri = sharedModulesDir && fs.existsSync(sharedModulesDir) ? vscode.Uri.file(sharedModulesDir) : undefined;
        const selectedFolders = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            defaultUri,
            title: 'Selecione a pasta de origem para escanear e importar módulos'
        });
        if (!selectedFolders || selectedFolders.length === 0) {
            return;
        }
        const sourceDir = selectedFolders[0].fsPath;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Escaneando pasta por módulos...',
            cancellable: false
        }, async () => {
            try {
                const files = dependency_scanner_1.DependencyScanner.getFilesRecursive(sourceDir, ['.bas', '.7proj']);
                if (files.length === 0) {
                    vscode.window.showWarningMessage('Nenhum arquivo .bas ou .7Proj encontrado na pasta selecionada.');
                    return;
                }
                const detectedList = [];
                const parser = new fast_xml_parser_1.XMLParser({
                    ignoreAttributes: true,
                    parseTagValue: false
                });
                for (const filePath of files) {
                    const ext = path.extname(filePath).toLowerCase();
                    if (ext === '.bas') {
                        try {
                            const content = fs.readFileSync(filePath, 'utf-8');
                            const contentLower = content.toLowerCase();
                            if (contentLower.includes('@module') && !contentLower.includes('@module-imported')) {
                                const filename = path.basename(filePath, '.bas');
                                const nsMatch = content.match(/\bNamespace\s+([a-zA-Z0-9_]+)/i);
                                const modName = nsMatch ? nsMatch[1] : filename;
                                detectedList.push({
                                    modName,
                                    sourcePath: filePath,
                                    code: content,
                                    type: 'bas'
                                });
                            }
                        }
                        catch { }
                    }
                    else if (ext === '.7proj') {
                        try {
                            const xmlContent = fs.readFileSync(filePath, 'utf-8');
                            const parsed = parser.parse(xmlContent);
                            const root = parsed.Projeto_Data7;
                            if (root && root.Modulos) {
                                const modulosContainer = root.Modulos;
                                Object.keys(modulosContainer).forEach(modName => {
                                    if (modName.startsWith('#') || modName.startsWith('@_')) {
                                        return;
                                    }
                                    const mod = modulosContainer[modName];
                                    const rawCode = mod.Codigo || '';
                                    const codeLower = rawCode.toLowerCase();
                                    if (codeLower.includes('@module') && !codeLower.includes('@module-imported')) {
                                        const decodedCode = this.decodeHtmlEntities(rawCode);
                                        detectedList.push({
                                            modName,
                                            sourcePath: filePath,
                                            code: decodedCode,
                                            type: '7proj'
                                        });
                                    }
                                });
                            }
                        }
                        catch { }
                    }
                }
                if (detectedList.length === 0) {
                    vscode.window.showInformationMessage('Nenhum módulo detectado nos arquivos da pasta de origem.');
                    return;
                }
                const quickPickItems = detectedList.map(d => ({
                    label: d.modName,
                    description: `Origem: ${path.basename(d.sourcePath)} (${d.type === 'bas' ? 'bas' : '7proj'})`,
                    detail: d.sourcePath,
                    moduleData: d
                }));
                const selected = await vscode.window.showQuickPick(quickPickItems, {
                    placeHolder: 'Selecione os módulos que deseja importar/aprovar para o repositório',
                    canPickMany: true,
                    ignoreFocusOut: true
                });
                if (!selected || selected.length === 0) {
                    return;
                }
                const selectedNames = new Set();
                const duplicates = new Set();
                for (const item of selected) {
                    const nameLower = item.moduleData.modName.toLowerCase();
                    if (selectedNames.has(nameLower)) {
                        duplicates.add(item.moduleData.modName);
                    }
                    selectedNames.add(nameLower);
                }
                if (duplicates.size > 0) {
                    vscode.window.showErrorMessage(`Importação cancelada. Você selecionou múltiplas fontes para o(s) mesmo(s) módulo(s): ${Array.from(duplicates).join(', ')}. Escolha apenas uma fonte por módulo.`);
                    return;
                }
                let count = 0;
                for (const item of selected) {
                    const d = item.moduleData;
                    const destPath = path.join(repoBasPath, `${d.modName}.bas`);
                    fs.writeFileSync(destPath, d.code, 'utf-8');
                    count++;
                }
                vscode.window.showInformationMessage(`${count} módulo(s) importados e limpos com sucesso no repositório.`);
            }
            catch (err) {
                vscode.window.showErrorMessage(`Erro ao realizar varredura/importação: ${err.message}`);
            }
        });
    }
    /**
     * Manage files in the private extension repository folder
     */
    static async exploreRepository() {
        const repoBasPath = this.getRepoBasPath();
        let files = [];
        try {
            files = fs.readdirSync(repoBasPath).filter(f => f.toLowerCase().endsWith('.bas'));
        }
        catch (err) {
            vscode.window.showErrorMessage(`Erro ao ler repositório: ${err.message}`);
            return;
        }
        if (files.length === 0) {
            vscode.window.showInformationMessage('Nenhum módulo encontrado no repositório.');
            return;
        }
        const quickPickItems = files.map(file => {
            const filePath = path.join(repoBasPath, file);
            let preview = '';
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split('\n');
                preview = lines.filter(l => l.trim().length > 0).slice(0, 3).join(' | ');
            }
            catch { }
            return {
                label: path.basename(file, '.bas'),
                description: file,
                detail: preview || filePath,
                filePath
            };
        });
        const selected = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: 'Selecione o módulo do repositório para gerenciar',
            ignoreFocusOut: true
        });
        if (!selected) {
            return;
        }
        const action = await vscode.window.showQuickPick(['Abrir arquivo para Visualizar/Editar', 'Excluir Módulo do Repositório'], {
            placeHolder: `Ação para o módulo "${selected.label}"`,
            ignoreFocusOut: true
        });
        if (!action) {
            return;
        }
        if (action === 'Abrir arquivo para Visualizar/Editar') {
            const doc = await vscode.workspace.openTextDocument(selected.filePath);
            await vscode.window.showTextDocument(doc);
        }
        else if (action === 'Excluir Módulo do Repositório') {
            const confirm = await vscode.window.showWarningMessage(`Deseja realmente excluir o módulo "${selected.label}" do repositório?`, { modal: true }, 'Sim', 'Não');
            if (confirm === 'Sim') {
                try {
                    fs.unlinkSync(selected.filePath);
                    vscode.window.showInformationMessage(`Módulo "${selected.label}" excluído do repositório.`);
                }
                catch (err) {
                    vscode.window.showErrorMessage(`Erro ao excluir módulo: ${err.message}`);
                }
            }
        }
    }
}
exports.RepositoryService = RepositoryService;
//# sourceMappingURL=repository-service.js.map