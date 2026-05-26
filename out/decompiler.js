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
exports.Decompiler = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fast_xml_parser_1 = require("fast-xml-parser");
class Decompiler {
    // Function to decode HTML entities if not done by fast-xml-parser
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
    static decompileProject(filePath, outputDir, knownSharedModules) {
        const xmlContent = fs.readFileSync(filePath, 'utf-8');
        const parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            parseTagValue: false, // Keep code strings raw to avoid converting numeric strings in code
            trimValues: false
        });
        const parsed = parser.parse(xmlContent);
        const root = parsed.Projeto_Data7;
        if (!root) {
            throw new Error('Formato do arquivo .7Proj inválido: tag Projeto_Data7 não encontrada.');
        }
        // Extract options
        const opcoesSource = root.Opcoes || {};
        const metadata = {
            nome: path.basename(filePath, path.extname(filePath)),
            language: root['@_Language'] || root.Linguagem || 'Basic',
            version: root['@_Version'] || root['@_Versão'] || '1.0',
            targetPlatform: root['@_TargetPlataform'] || 'Default',
            opcoes: {
                autor: opcoesSource.Autor || '',
                versao: opcoesSource.Versao || opcoesSource.Versão || '1.0.0.0',
                informacoes: opcoesSource.Informacoes || '',
                codEmpresa: parseInt(opcoesSource.CodEmpresa || '1', 10),
                codFilial: parseInt(opcoesSource.CodFilial || '1', 10),
                nomeUsuario: opcoesSource.NomeUsuario || 'Administrador',
                preScript: opcoesSource.PreScript || '',
                identificacaoBancoDados: opcoesSource.IdentificacaoBancoDados || ''
            },
            virtualFolders: [],
            modulesMetadata: {},
            dependencies: {}
        };
        // Re-create target output workspace directories
        const srcDir = path.join(outputDir, 'src');
        if (fs.existsSync(srcDir)) {
            fs.rmSync(srcDir, { recursive: true, force: true });
        }
        fs.mkdirSync(srcDir, { recursive: true });
        // Extract Main Code
        const mainCode = this.decodeHtmlEntities(root.Codigo || '');
        fs.writeFileSync(path.join(srcDir, 'Principal.bas'), mainCode, 'utf-8');
        // Extract Pastas (Virtual Folders)
        const foldersMap = {};
        const pastasContainer = root.Pastas || {};
        let pastasList = [];
        if (pastasContainer.Pasta) {
            pastasList = Array.isArray(pastasContainer.Pasta) ? pastasContainer.Pasta : [pastasContainer.Pasta];
        }
        // Map representation to build physical directory structure from virtual folders
        pastasList.forEach((p) => {
            const f = {
                nome: p.Nome || '',
                id: p.ID || '',
                pastaId: p.PastaID || '',
                aberta: p.Aberta || 'Nao'
            };
            metadata.virtualFolders.push(f);
        });
        // Helper function to build folder path recursively based on parent folder IDs
        const getFolderPath = (folderId) => {
            if (!folderId) {
                return '';
            }
            if (foldersMap[folderId]) {
                return foldersMap[folderId].path;
            }
            const folder = metadata.virtualFolders.find(f => f.id === folderId);
            if (!folder) {
                return '';
            }
            // Abstract the root "Unidades (X)" folder so it's not created physically
            if (!folder.pastaId && folder.nome.startsWith('Unidades')) {
                foldersMap[folderId] = { path: '', name: folder.nome };
                return '';
            }
            const parentPath = getFolderPath(folder.pastaId);
            // Sanitize folder name for physical filesystem
            const sanitizedName = folder.nome.replace(/[\\/:*?"<>|]/g, '_');
            const fullPath = parentPath ? path.join(parentPath, sanitizedName) : sanitizedName;
            foldersMap[folderId] = { path: fullPath, name: folder.nome };
            return fullPath;
        };
        // Pre-generate virtual folder path mappings
        metadata.virtualFolders.forEach(f => {
            getFolderPath(f.id);
        });
        const detectedDeps = {};
        // Extract Modules
        const modulosContainer = root.Modulos || {};
        // Under <Modulos>, each tag represents a module (e.g. <mod_args> or <mod_console>)
        Object.keys(modulosContainer).forEach(modName => {
            if (modName.startsWith('@_') || modName.startsWith('#')) {
                return; // Ignore XML attributes and text/whitespace nodes
            }
            const mod = modulosContainer[modName];
            const modCode = this.decodeHtmlEntities(mod.Codigo || '');
            const folderId = mod.PastaID || '';
            const aberto = String(mod.Aberto).toLowerCase() === 'true';
            const ordemAbertura = parseInt(mod.OrdemAbertura || '0', 10);
            // Identify if this module is an external shared module dependency
            const lowerModName = modName.toLowerCase();
            const isDependency = modCode.toLowerCase().includes('@module-imported') ||
                (knownSharedModules && knownSharedModules.has(lowerModName));
            if (isDependency) {
                // Add to detected dependencies
                detectedDeps[modName] = '1.0.0.0';
                return; // Skip extracting it into src/
            }
            // Save module metadata for local module
            metadata.modulesMetadata[modName] = {
                nome: modName,
                aberto,
                ordemAbertura,
                pastaId: folderId
            };
            // Calculate target directory
            const relFolderPath = foldersMap[folderId]?.path || '';
            const targetFolder = path.join(srcDir, relFolderPath);
            fs.mkdirSync(targetFolder, { recursive: true });
            // Save module code
            const filePath = path.join(targetFolder, `${modName}.bas`);
            fs.writeFileSync(filePath, modCode, 'utf-8');
        });
        // Save project configuration JSON
        const configPath = path.join(outputDir, 'data7.json');
        metadata.dependencies = detectedDeps;
        fs.writeFileSync(configPath, JSON.stringify(metadata, null, 2), 'utf-8');
        return metadata;
    }
}
exports.Decompiler = Decompiler;
//# sourceMappingURL=decompiler.js.map