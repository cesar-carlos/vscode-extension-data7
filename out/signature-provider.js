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
exports.D7BasicSignatureHelpProvider = void 0;
const vscode = __importStar(require("vscode"));
const symbol_indexer_1 = require("./symbol-indexer");
const system_library_1 = require("./system-library");
const completion_provider_1 = require("./completion-provider");
class D7BasicSignatureHelpProvider {
    constructor() {
        this.indexer = symbol_indexer_1.WorkspaceSymbolIndexer.getInstance();
    }
    static getSignatureHelpContext(lineText, characterIdx) {
        let parenCount = 0;
        let commaCount = 0;
        let inQuote = false;
        let wordEndIdx = -1;
        // Scan backward from characterIdx - 1
        for (let i = characterIdx - 1; i >= 0; i--) {
            const char = lineText[i];
            if (char === '"') {
                inQuote = !inQuote;
                continue;
            }
            if (inQuote)
                continue;
            if (char === ')') {
                parenCount++;
            }
            else if (char === '(') {
                if (parenCount > 0) {
                    parenCount--;
                }
                else {
                    wordEndIdx = i;
                    break;
                }
            }
            else if (char === ',' && parenCount === 0) {
                commaCount++;
            }
        }
        if (wordEndIdx === -1)
            return undefined;
        // Extract the function name word preceding the '('
        let scanIdx = wordEndIdx - 1;
        while (scanIdx >= 0 && /\s/.test(lineText[scanIdx])) {
            scanIdx--;
        }
        const idMatch = lineText.substring(0, scanIdx + 1).match(/([a-zA-Z0-9_]+)$/);
        if (!idMatch)
            return undefined;
        const funcName = idMatch[1];
        let dotPrefix;
        const prefixStart = idMatch.index || 0;
        if (prefixStart > 0 && lineText[prefixStart - 1] === '.') {
            const prefixMatch = lineText.substring(0, prefixStart - 1).match(/([a-zA-Z0-9_]+)$/);
            if (prefixMatch) {
                dotPrefix = prefixMatch[1];
            }
        }
        return {
            name: funcName,
            dotPrefix,
            activeParamIdx: commaCount
        };
    }
    provideSignatureHelp(document, position, token, context) {
        const lineText = document.lineAt(position.line).text;
        const sigCtx = D7BasicSignatureHelpProvider.getSignatureHelpContext(lineText, position.character);
        if (!sigCtx)
            return undefined;
        let targetSymbol;
        if (sigCtx.dotPrefix) {
            const dotPrefixLower = sigCtx.dotPrefix.toLowerCase();
            if (dotPrefixLower === 'me' || dotPrefixLower === 'mybase') {
                const fileSyms = this.indexer.getFileSymbols(document.uri.toString());
                if (fileSyms) {
                    const currentClass = fileSyms.symbols.find(s => s.kind === 'class' &&
                        position.line >= s.range.startLine &&
                        (s.range.endLine === undefined || position.line <= s.range.endLine));
                    if (currentClass) {
                        targetSymbol = this.findClassMember(currentClass.name, sigCtx.name);
                    }
                }
            }
            else {
                let typeName = completion_provider_1.TypeResolver.getVariableType(sigCtx.dotPrefix, document, position, this.indexer);
                if (!typeName) {
                    const staticSymbol = this.indexer.findSymbolByName(sigCtx.dotPrefix, document.uri.toString()) ||
                        system_library_1.SYSTEM_SYMBOLS.find(s => s.name.toLowerCase() === dotPrefixLower && (s.kind === 'namespace' || s.kind === 'class'));
                    if (staticSymbol) {
                        typeName = staticSymbol.name;
                    }
                }
                if (typeName) {
                    targetSymbol = this.findClassMember(typeName, sigCtx.name);
                }
            }
        }
        else {
            targetSymbol = this.indexer.findSymbolByName(sigCtx.name, document.uri.toString()) ||
                system_library_1.SYSTEM_SYMBOLS.find(s => s.name.toLowerCase() === sigCtx.name.toLowerCase() && (s.kind === 'method' || s.kind === 'declare_function' || s.kind === 'declare_sub'));
        }
        if (targetSymbol && (targetSymbol.kind === 'method' || targetSymbol.kind === 'declare_function' || targetSymbol.kind === 'declare_sub' || targetSymbol.kind === 'delegate')) {
            const sigHelp = new vscode.SignatureHelp();
            const paramList = targetSymbol.parameters?.map(p => {
                let pStr = '';
                if (p.isOptional)
                    pStr += 'Optional ';
                if (p.isByRef)
                    pStr += 'ByRef ';
                pStr += `${p.name} As ${p.type}`;
                if (p.defaultValue)
                    pStr += ` = ${p.defaultValue}`;
                return pStr;
            }).join(', ') || '';
            const isSub = targetSymbol.type === 'Void';
            const label = `${targetSymbol.kind === 'delegate' ? 'Delegate ' : ''}${isSub ? 'Sub' : 'Function'} ${targetSymbol.name}(${paramList})${!isSub ? ` As ${targetSymbol.type}` : ''}`;
            const sigInfo = new vscode.SignatureInformation(label, targetSymbol.description || undefined);
            sigInfo.parameters = targetSymbol.parameters?.map(p => {
                let doc = p.isOptional ? 'Opcional. ' : 'Obrigatório. ';
                if (p.isByRef)
                    doc += 'Passado por referência (ByRef). ';
                if (p.defaultValue)
                    doc += `Valor padrão: ${p.defaultValue}`;
                return new vscode.ParameterInformation(`${p.name} As ${p.type}`, doc);
            }) || [];
            sigHelp.signatures = [sigInfo];
            sigHelp.activeSignature = 0;
            sigHelp.activeParameter = Math.min(sigCtx.activeParamIdx, sigInfo.parameters.length - 1);
            return sigHelp;
        }
        return undefined;
    }
    findClassMember(className, memberName) {
        const memberLower = memberName.toLowerCase();
        let match = system_library_1.SYSTEM_SYMBOLS.find(s => s.containerName?.toLowerCase() === className.toLowerCase() &&
            s.name.toLowerCase() === memberLower);
        if (match)
            return match;
        match = this.indexer.findClassMember(className, memberName);
        if (match)
            return match;
        let currentClass = this.indexer.findSymbolByName(className) ||
            system_library_1.SYSTEM_SYMBOLS.find(s => s.name.toLowerCase() === className.toLowerCase() && s.kind === 'class');
        const visited = new Set();
        while (currentClass && currentClass.inheritsFrom && !visited.has(currentClass.name.toLowerCase())) {
            visited.add(currentClass.name.toLowerCase());
            const parentName = currentClass.inheritsFrom;
            match = system_library_1.SYSTEM_SYMBOLS.find(s => s.containerName?.toLowerCase() === parentName.toLowerCase() &&
                s.name.toLowerCase() === memberLower);
            if (match)
                return match;
            match = this.indexer.findClassMember(parentName, memberName);
            if (match)
                return match;
            currentClass = this.indexer.findSymbolByName(parentName) ||
                system_library_1.SYSTEM_SYMBOLS.find(s => s.name.toLowerCase() === parentName.toLowerCase() && s.kind === 'class');
        }
        return undefined;
    }
}
exports.D7BasicSignatureHelpProvider = D7BasicSignatureHelpProvider;
//# sourceMappingURL=signature-provider.js.map