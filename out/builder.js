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
exports.Builder = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Builder {
    static xmlEscape(str) {
        if (typeof str !== 'string') {
            return '';
        }
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    // Generate simple GUID format: {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}
    static generateGuid() {
        const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1).toUpperCase();
        return `{${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}}`;
    }
    static optimizeCode(code, minifyEnabled, stripCommentsEnabled) {
        if (!minifyEnabled && !stripCommentsEnabled) {
            return code;
        }
        const lines = code.split(/\r?\n/);
        const resultLines = [];
        for (let lineText of lines) {
            let cleanLine = lineText;
            if (stripCommentsEnabled) {
                let inQuote = false;
                let commentStartIdx = -1;
                for (let i = 0; i < lineText.length; i++) {
                    const char = lineText[i];
                    if (char === '"') {
                        inQuote = !inQuote;
                    }
                    else if (!inQuote) {
                        if (char === "'") {
                            commentStartIdx = i;
                            break;
                        }
                        else if (lineText.substring(i).toLowerCase().startsWith('rem ')) {
                            commentStartIdx = i;
                            break;
                        }
                    }
                }
                if (commentStartIdx !== -1) {
                    cleanLine = lineText.substring(0, commentStartIdx);
                }
            }
            if (minifyEnabled) {
                const trimmed = cleanLine.trim();
                if (!trimmed) {
                    continue;
                }
                let compressed = '';
                let inString = false;
                let i = 0;
                while (i < trimmed.length) {
                    const char = trimmed[i];
                    if (char === '"') {
                        inString = !inString;
                        compressed += char;
                        i++;
                    }
                    else if (inString) {
                        compressed += char;
                        i++;
                    }
                    else {
                        if (/\s/.test(char)) {
                            compressed += ' ';
                            while (i < trimmed.length && /\s/.test(trimmed[i])) {
                                i++;
                            }
                        }
                        else {
                            compressed += char;
                            i++;
                        }
                    }
                }
                resultLines.push(compressed);
            }
            else {
                const trimmed = cleanLine.trim();
                if (!trimmed && cleanLine.length > 0) {
                    continue;
                }
                resultLines.push(cleanLine);
            }
        }
        return resultLines.join('\r\n');
    }
    // List directories recursively
    static getDirsRecursive(dir) {
        let results = [];
        if (!fs.existsSync(dir)) {
            return results;
        }
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                results.push(filePath);
                results = results.concat(this.getDirsRecursive(filePath));
            }
        });
        return results;
    }
    static buildProject(workspaceDir, outputFilePath, sharedModulesDir) {
        const configPath = path.join(workspaceDir, 'data7.json');
        if (!fs.existsSync(configPath)) {
            throw new Error('Configuração do projeto (data7.json) não encontrada no workspace.');
        }
        const metadata = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const srcDir = path.join(workspaceDir, 'src');
        const data7ModulesDir = path.join(workspaceDir, 'data7_modules');
        if (!fs.existsSync(srcDir)) {
            throw new Error('Pasta src/ não encontrada no workspace.');
        }
        // 1. Read Principal.bas
        const mainCodePath = path.join(srcDir, 'Principal.bas');
        if (!fs.existsSync(mainCodePath)) {
            throw new Error('Código principal src/Principal.bas não encontrado.');
        }
        const mainCodeRaw = fs.readFileSync(mainCodePath, 'utf-8');
        const minify = !!metadata.opcoes?.minify;
        const stripComments = !!metadata.opcoes?.stripComments;
        const mainCode = this.optimizeCode(mainCodeRaw, minify, stripComments);
        // Helper to find files recursively
        const getFilesRecursive = (dir, ext) => {
            let results = [];
            if (!fs.existsSync(dir)) {
                return results;
            }
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(getFilesRecursive(filePath, ext));
                }
                else if (path.extname(file).toLowerCase() === ext) {
                    results.push(filePath);
                }
            });
            return results;
        };
        // Calculate total modules Y
        const srcFiles = getFilesRecursive(srcDir, '.bas');
        const localModulesCount = srcFiles.filter(filePath => path.basename(filePath, '.bas') !== 'Principal').length;
        let dependencyModulesCount = 0;
        if (fs.existsSync(data7ModulesDir)) {
            dependencyModulesCount = fs.readdirSync(data7ModulesDir).filter(f => f.endsWith('.bas')).length;
        }
        const totalModulesCount = localModulesCount + dependencyModulesCount;
        // Find or create root folder Unidades (Y)
        let rootFolder = metadata.virtualFolders.find(f => !f.pastaId && f.nome.startsWith('Unidades'));
        let rootFolderId = rootFolder ? rootFolder.id : this.generateGuid();
        // Helper to compute virtual folder relative path
        const getVirtualFolderRelPath = (folderId) => {
            const folder = metadata.virtualFolders.find(f => f.id === folderId);
            if (!folder)
                return '';
            if (!folder.pastaId || folder.id === rootFolderId)
                return '';
            // Special case for data7_modules folder
            if (folder.nome === 'data7_modules' && folder.pastaId === rootFolderId) {
                return 'data7_modules';
            }
            const parentPath = getVirtualFolderRelPath(folder.pastaId);
            const sanitizedName = folder.nome.replace(/[\\/:*?"<>|]/g, '_');
            return parentPath ? path.join(parentPath, sanitizedName) : sanitizedName;
        };
        // Filter virtual folders: keep only the ones that physically exist on disk (plus root)
        const activeFolders = metadata.virtualFolders.filter(folder => {
            if (!folder.pastaId || folder.id === rootFolderId) {
                return true;
            }
            if (folder.nome === 'data7_modules' && folder.pastaId === rootFolderId) {
                return fs.existsSync(data7ModulesDir);
            }
            const relPath = getVirtualFolderRelPath(folder.id);
            const physicalPath = path.join(srcDir, relPath);
            return fs.existsSync(physicalPath) && fs.statSync(physicalPath).isDirectory();
        });
        const virtualFolders = [...activeFolders];
        if (!rootFolder) {
            rootFolder = {
                nome: `Unidades (${totalModulesCount})`,
                id: rootFolderId,
                pastaId: '',
                aberta: 'Sim'
            };
            virtualFolders.push(rootFolder);
        }
        else {
            const idx = virtualFolders.findIndex(f => f.id === rootFolderId);
            if (idx !== -1) {
                virtualFolders[idx].nome = `Unidades (${totalModulesCount})`;
            }
            else {
                rootFolder.nome = `Unidades (${totalModulesCount})`;
                virtualFolders.push(rootFolder);
            }
        }
        // 2. Synchronize directories under src/ to map them as virtual folders
        const physicalDirs = this.getDirsRecursive(srcDir);
        const foldersByPath = new Map(); // relPath -> ID
        // Pre-populate folders already defined in JSON
        const buildPathMap = (folderId) => {
            const folder = virtualFolders.find(f => f.id === folderId);
            if (!folder) {
                return '';
            }
            if (folder.id === rootFolderId) {
                foldersByPath.set('', folder.id);
                return '';
            }
            const parentPath = buildPathMap(folder.pastaId);
            const sanitizedName = folder.nome.replace(/[\\/:*?"<>|]/g, '_');
            const fullPath = parentPath ? path.join(parentPath, sanitizedName) : sanitizedName;
            foldersByPath.set(fullPath, folder.id);
            return fullPath;
        };
        virtualFolders.forEach(f => {
            buildPathMap(f.id);
        });
        // Create virtual folders for any new physical directories under src/
        physicalDirs.forEach(dir => {
            const relPath = path.relative(srcDir, dir);
            if (foldersByPath.has(relPath)) {
                return; // Already mapped
            }
            // Determine parent ID (relative to src/)
            const parentDir = path.dirname(relPath);
            let parentId = rootFolderId;
            if (parentDir !== '.' && parentDir !== '') {
                parentId = foldersByPath.get(parentDir) || rootFolderId;
            }
            const newId = this.generateGuid();
            const folderName = path.basename(relPath);
            const newFolder = {
                nome: folderName,
                id: newId,
                pastaId: parentId,
                aberta: 'Sim'
            };
            virtualFolders.push(newFolder);
            foldersByPath.set(relPath, newId);
        });
        const modulesToCompile = [];
        const newModulesMetadata = {};
        // Scan src/ for modules
        srcFiles.forEach(filePath => {
            const filename = path.basename(filePath, '.bas');
            if (filename === 'Principal') {
                return; // Skip Principal.bas
            }
            const relFileDir = path.relative(srcDir, path.dirname(filePath));
            const folderId = relFileDir ? (foldersByPath.get(relFileDir) || rootFolderId) : rootFolderId;
            const rawCode = fs.readFileSync(filePath, 'utf-8');
            const code = this.optimizeCode(rawCode, minify, stripComments);
            // Retrieve metadata from config or fallback
            const meta = metadata.modulesMetadata[filename] || {
                aberto: true,
                ordemAbertura: 0
            };
            const moduleMeta = {
                nome: filename,
                aberto: meta.aberto !== undefined ? meta.aberto : true,
                ordemAbertura: meta.ordemAbertura !== undefined ? meta.ordemAbertura : 0,
                pastaId: folderId
            };
            newModulesMetadata[filename] = moduleMeta;
            modulesToCompile.push({
                name: filename,
                code,
                folderId,
                aberto: moduleMeta.aberto,
                ordemAbertura: moduleMeta.ordemAbertura
            });
        });
        // Scan data7_modules/ for dependencies and put them in a dedicated folder "data7_modules"
        if (fs.existsSync(data7ModulesDir)) {
            const dependencyFiles = fs.readdirSync(data7ModulesDir).filter(f => f.endsWith('.bas'));
            if (dependencyFiles.length > 0) {
                // Find or create virtual folder for data7_modules under root folder Unidades (Y)
                let data7ModulesFolder = virtualFolders.find(f => f.nome === 'data7_modules' && f.pastaId === rootFolderId);
                let data7ModulesFolderId = data7ModulesFolder?.id;
                if (!data7ModulesFolderId) {
                    data7ModulesFolderId = this.generateGuid();
                    virtualFolders.push({
                        nome: 'data7_modules',
                        id: data7ModulesFolderId,
                        pastaId: rootFolderId,
                        aberta: 'Nao'
                    });
                }
                dependencyFiles.forEach(file => {
                    const filename = path.basename(file, '.bas');
                    let rawCode = fs.readFileSync(path.join(data7ModulesDir, file), 'utf-8');
                    // Ensure '@module-imported' is marked in the code so the decompiler and IDE treat it as a shared module dependency
                    if (!rawCode.toLowerCase().includes('@module-imported')) {
                        if (rawCode.toLowerCase().includes('@module')) {
                            rawCode = rawCode.replace(/@module/i, '@Module-Imported');
                        }
                        else {
                            rawCode = `'@Module-Imported\r\n` + rawCode;
                        }
                    }
                    const code = this.optimizeCode(rawCode, minify, stripComments);
                    modulesToCompile.push({
                        name: filename,
                        code,
                        folderId: data7ModulesFolderId,
                        aberto: false,
                        ordemAbertura: 0
                    });
                });
            }
        }
        // 4. Assemble the XML structure
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += `<Projeto_Data7 xmlns="http://www.se7esistemas.com.br/developer/2024" Version="${metadata.version}" Language="${metadata.language}" Type="Plugin" TargetPlataform="${metadata.targetPlatform}">\n`;
        xml += '  <Opcoes>\n';
        xml += `    <Autor>${this.xmlEscape(metadata.opcoes.autor)}</Autor>\n`;
        xml += `    <Versao>${this.xmlEscape(metadata.opcoes.versao)}</Versao>\n`;
        xml += `    <Informacoes>${this.xmlEscape(metadata.opcoes.informacoes)}</Informacoes>\n`;
        xml += `    <CodEmpresa>${metadata.opcoes.codEmpresa}</CodEmpresa>\n`;
        xml += `    <CodFilial>${metadata.opcoes.codFilial}</CodFilial>\n`;
        xml += `    <NomeUsuario>${this.xmlEscape(metadata.opcoes.nomeUsuario)}</NomeUsuario>\n`;
        xml += `    <PreScript>${this.xmlEscape(metadata.opcoes.preScript)}</PreScript>\n`;
        xml += `    <IdentificacaoBancoDados>${this.xmlEscape(metadata.opcoes.identificacaoBancoDados)}</IdentificacaoBancoDados>\n`;
        xml += '  </Opcoes>\n';
        xml += '  <Nome>Principal</Nome>\n';
        xml += `  <Data>${new Date().toLocaleString('pt-BR').replace(/,/g, '')}</Data>\n`;
        xml += `  <Codigo>${this.xmlEscape(mainCode)}</Codigo>\n`;
        xml += '  <Aberto>true</Aberto>\n';
        xml += '  <OrdemAbertura>0</OrdemAbertura>\n';
        xml += '  <ItemAberto>0</ItemAberto>\n';
        // Render Pastas
        // Sort virtual folders: root folder first, then data7_modules folder, then all other folders.
        const orderedFolders = [];
        // Find root folder
        const root = virtualFolders.find(f => f.id === rootFolderId);
        if (root) {
            orderedFolders.push(root);
        }
        // Find data7_modules folder under root
        const d7Modules = virtualFolders.find(f => f.nome === 'data7_modules' && f.pastaId === rootFolderId);
        if (d7Modules) {
            orderedFolders.push(d7Modules);
        }
        // Add the rest
        virtualFolders.forEach(f => {
            if (f.id !== rootFolderId && !(f.nome === 'data7_modules' && f.pastaId === rootFolderId)) {
                orderedFolders.push(f);
            }
        });
        xml += '  <Pastas>\n';
        orderedFolders.forEach(f => {
            xml += '    <Pasta>\n';
            xml += `      <Nome>${this.xmlEscape(f.nome)}</Nome>\n`;
            xml += `      <ID>${f.id}</ID>\n`;
            xml += `      <PastaID>${f.pastaId}</PastaID>\n`;
            xml += `      <Aberta>${f.aberta}</Aberta>\n`;
            xml += '    </Pasta>\n';
        });
        xml += '  </Pastas>\n';
        // Render Modulos
        xml += '  <Modulos>\n';
        modulesToCompile.forEach(m => {
            xml += `    <${m.name}>\n`;
            xml += `      <Codigo>${this.xmlEscape(m.code)}</Codigo>\n`;
            xml += `      <Aberto>${m.aberto}</Aberto>\n`;
            xml += `      <OrdemAbertura>${m.ordemAbertura}</OrdemAbertura>\n`;
            xml += `      <PastaID>${m.folderId}</PastaID>\n`;
            xml += `    </${m.name}>\n`;
        });
        xml += '  </Modulos>\n';
        xml += '</Projeto_Data7>\n';
        // Make sure target directory exists
        const outputDir = path.dirname(outputFilePath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(outputFilePath, xml, 'utf-8');
        // Update data7.json in-place to store any newly generated GUIDs and folders
        metadata.virtualFolders = orderedFolders;
        metadata.modulesMetadata = newModulesMetadata;
        fs.writeFileSync(configPath, JSON.stringify(metadata, null, 2), 'utf-8');
        return outputFilePath;
    }
}
exports.Builder = Builder;
//# sourceMappingURL=builder.js.map