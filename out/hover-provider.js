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
exports.D7BasicHoverProvider = void 0;
const vscode = __importStar(require("vscode"));
const symbol_indexer_1 = require("./symbol-indexer");
const system_library_1 = require("./system-library");
const completion_provider_1 = require("./completion-provider");
class D7BasicHoverProvider {
    constructor() {
        this.indexer = symbol_indexer_1.WorkspaceSymbolIndexer.getInstance();
    }
    static getSymbolSignature(s) {
        let modPart = '';
        if (s.isPrivate)
            modPart += 'Private ';
        else
            modPart += 'Public ';
        if (s.isShared && s.kind !== 'declare_sub' && s.kind !== 'declare_function')
            modPart += 'Shared ';
        const paramsPart = s.parameters
            ? '(' + s.parameters.map(p => {
                let pStr = '';
                if (p.isOptional)
                    pStr += 'Optional ';
                if (p.isByRef)
                    pStr += 'ByRef ';
                pStr += `${p.name} As ${p.type}`;
                if (p.defaultValue)
                    pStr += ` = ${p.defaultValue}`;
                return pStr;
            }).join(', ') + ')'
            : '';
        switch (s.kind) {
            case 'namespace':
                return `Namespace ${s.name}`;
            case 'class':
                return `${modPart}Class ${s.name}${s.inheritsFrom ? `\nInherits ${s.inheritsFrom}` : ''}`;
            case 'structure':
                return `${modPart}Structure ${s.name}`;
            case 'delegate':
                return `${modPart}Delegate ${s.type === 'Void' ? 'Sub' : 'Function'} ${s.name}${paramsPart}${s.type !== 'Void' ? ` As ${s.type}` : ''}`;
            case 'declare_sub':
                return `${modPart}Declare Sub ${s.name}${paramsPart}`;
            case 'declare_function':
                return `${modPart}Declare Function ${s.name}${paramsPart} As ${s.type}`;
            case 'method':
                const isSub = s.type === 'Void';
                return `${modPart}${isSub ? 'Sub' : 'Function'} ${s.name}${paramsPart}${!isSub ? ` As ${s.type}` : ''}`;
            case 'property':
                return `${modPart}Property ${s.name} As ${s.type}`;
            case 'variable':
                return `${modPart}Dim ${s.name} As ${s.type}`;
            default:
                return s.name;
        }
    }
    provideHover(document, position, token) {
        const range = document.getWordRangeAtPosition(position);
        if (!range)
            return undefined;
        const word = document.getText(range);
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, range.start.character).trim();
        let targetSymbol;
        // Case A: Hovering on a member of an object (e.g. `obj.Member`)
        if (textBeforeCursor.endsWith('.')) {
            const dotIndex = lineText.lastIndexOf('.', range.start.character);
            if (dotIndex !== -1) {
                const prefix = lineText.substring(0, dotIndex).trim();
                const lastWordMatch = prefix.match(/([a-zA-Z0-9_]+)$/);
                if (lastWordMatch) {
                    const triggerWord = lastWordMatch[1];
                    const triggerLower = triggerWord.toLowerCase();
                    if (triggerLower === 'me' || triggerLower === 'mybase') {
                        const fileSyms = this.indexer.getFileSymbols(document.uri.toString());
                        if (fileSyms) {
                            const currentClass = fileSyms.symbols.find(s => s.kind === 'class' &&
                                position.line >= s.range.startLine &&
                                (s.range.endLine === undefined || position.line <= s.range.endLine));
                            if (currentClass) {
                                targetSymbol = this.findClassMember(currentClass.name, word);
                            }
                        }
                    }
                    else {
                        // Resolve variable type or namespace/class name
                        let typeName = completion_provider_1.TypeResolver.getVariableType(triggerWord, document, position, this.indexer);
                        if (!typeName) {
                            const staticSymbol = this.indexer.findSymbolByName(triggerWord, document.uri.toString()) ||
                                system_library_1.SYSTEM_SYMBOLS.find(s => s.name.toLowerCase() === triggerLower && (s.kind === 'namespace' || s.kind === 'class'));
                            if (staticSymbol) {
                                typeName = staticSymbol.name;
                            }
                        }
                        if (typeName) {
                            targetSymbol = this.findClassMember(typeName, word);
                        }
                    }
                }
            }
        }
        // Case B: Hovering on a global or direct identifier
        if (!targetSymbol) {
            targetSymbol = this.indexer.findSymbolByName(word, document.uri.toString()) ||
                system_library_1.SYSTEM_SYMBOLS.find(s => s.name.toLowerCase() === word.toLowerCase() && (!s.containerName || s.kind === 'namespace' || s.kind === 'class'));
        }
        if (targetSymbol) {
            const signature = D7BasicHoverProvider.getSymbolSignature(targetSymbol);
            const markdown = new vscode.MarkdownString();
            markdown.appendCodeblock(signature, 'd7basic');
            if (targetSymbol.description) {
                markdown.appendMarkdown('\n---\n');
                markdown.appendMarkdown(targetSymbol.description);
            }
            // Add preview of members for class, structure, or namespace (including inherited)
            if (targetSymbol.kind === 'class' || targetSymbol.kind === 'structure' || targetSymbol.kind === 'namespace') {
                const members = completion_provider_1.D7BasicCompletionProvider.getAllMembersForType(targetSymbol.name, this.indexer);
                if (members.length > 0) {
                    markdown.appendMarkdown('\n---\n**Membros:**\n');
                    const uniqueMembers = new Map();
                    members.forEach(m => {
                        const key = `${m.kind}:${m.name.toLowerCase()}`;
                        if (!uniqueMembers.has(key)) {
                            uniqueMembers.set(key, m);
                        }
                    });
                    const sortedMembers = Array.from(uniqueMembers.values()).sort((a, b) => a.name.localeCompare(b.name));
                    sortedMembers.forEach(m => {
                        let mSig = m.name;
                        if (m.kind === 'method' || m.kind === 'declare_sub' || m.kind === 'declare_function') {
                            const params = m.parameters ? m.parameters.map(p => p.type).join(', ') : '';
                            mSig = `${m.name}(${params}) As ${m.type}`;
                        }
                        else if (m.kind === 'property' || m.kind === 'variable') {
                            mSig = `${m.name} As ${m.type}`;
                        }
                        markdown.appendMarkdown(`- \`${mSig}\` (${m.kind})\n`);
                    });
                }
            }
            // Add file origin metadata
            markdown.appendMarkdown('\n\n---\n');
            if (targetSymbol.fileUri?.startsWith('system://')) {
                markdown.appendMarkdown('*Biblioteca do Sistema (Delphi ERP)*');
            }
            else if (targetSymbol.fileUri?.toLowerCase().includes('data7_modules')) {
                markdown.appendMarkdown('*Módulo de Dependência Compartilhada (data7_modules)*');
            }
            else {
                markdown.appendMarkdown('*Símbolo Local do Projeto*');
            }
            return new vscode.Hover(markdown, range);
        }
        return undefined;
    }
    findClassMember(className, memberName) {
        const memberLower = memberName.toLowerCase();
        // Walk own + inherited classes using the central qualified-name resolver
        const visited = new Set();
        const search = (currentTypeName) => {
            const key = currentTypeName.toLowerCase();
            if (visited.has(key))
                return undefined;
            visited.add(key);
            const classSymbol = completion_provider_1.TypeResolver.findClassSymbol(currentTypeName, this.indexer);
            if (!classSymbol)
                return undefined;
            const shortName = currentTypeName.includes('.')
                ? currentTypeName.split('.').pop().toLowerCase()
                : currentTypeName.toLowerCase();
            // Search members in system library (qualified + short name)
            const sysMatch = system_library_1.SYSTEM_SYMBOLS.find(s => s.name.toLowerCase() === memberLower &&
                s.containerName !== undefined &&
                (s.containerName.toLowerCase() === key || s.containerName.toLowerCase() === shortName));
            if (sysMatch)
                return sysMatch;
            // Search workspace members
            const wsMatch = this.indexer.getAllSymbols().find(s => s.name.toLowerCase() === memberLower &&
                s.containerName !== undefined &&
                (s.containerName.toLowerCase() === key || s.containerName.toLowerCase() === shortName));
            if (wsMatch)
                return wsMatch;
            // Recurse into parent class
            if (classSymbol.inheritsFrom) {
                return search(classSymbol.inheritsFrom);
            }
            return undefined;
        };
        return search(className);
    }
}
exports.D7BasicHoverProvider = D7BasicHoverProvider;
//# sourceMappingURL=hover-provider.js.map