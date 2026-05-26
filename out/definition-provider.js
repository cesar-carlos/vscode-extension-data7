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
exports.D7BasicDefinitionProvider = void 0;
const vscode = __importStar(require("vscode"));
const symbol_indexer_1 = require("./symbol-indexer");
const completion_provider_1 = require("./completion-provider");
class D7BasicDefinitionProvider {
    constructor() {
        this.indexer = symbol_indexer_1.WorkspaceSymbolIndexer.getInstance();
    }
    provideDefinition(document, position, token) {
        const range = document.getWordRangeAtPosition(position);
        if (!range)
            return undefined;
        const word = document.getText(range);
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, range.start.character).trim();
        let targetSymbol;
        // Case A: Cursor is on a member call (e.g., `obj.Member` or `me.Member`)
        if (textBeforeCursor.endsWith('.')) {
            const dotIndex = lineText.lastIndexOf('.', range.start.character);
            if (dotIndex !== -1) {
                const prefix = lineText.substring(0, dotIndex).trim();
                const lastWordMatch = prefix.match(/([a-zA-Z0-9_]+)$/);
                if (lastWordMatch) {
                    const triggerWord = lastWordMatch[1];
                    const triggerLower = triggerWord.toLowerCase();
                    if (triggerLower === 'me' || triggerLower === 'mybase') {
                        // Find current class context
                        const fileSyms = this.indexer.getFileSymbols(document.uri.toString());
                        if (fileSyms) {
                            const currentClass = fileSyms.symbols.find(s => s.kind === 'class' &&
                                position.line >= s.range.startLine &&
                                (s.range.endLine === undefined || position.line <= s.range.endLine));
                            if (currentClass) {
                                // Look for member in current class or parent classes
                                targetSymbol = this.indexer.findClassMember(currentClass.name, word);
                            }
                        }
                    }
                    else {
                        // Resolve variable type or namespace
                        let typeName = completion_provider_1.TypeResolver.getVariableType(triggerWord, document, position, this.indexer);
                        if (!typeName) {
                            // Try to treat triggerWord as class or namespace itself
                            const staticSymbol = this.indexer.findSymbolByName(triggerWord, document.uri.toString());
                            if (staticSymbol) {
                                typeName = staticSymbol.name;
                            }
                        }
                        if (typeName) {
                            targetSymbol = this.indexer.findClassMember(typeName, word);
                        }
                    }
                }
            }
        }
        // Case B: Global/Standalone Reference (e.g. Type, ClassName, namespace, helper function)
        if (!targetSymbol) {
            targetSymbol = this.indexer.findSymbolByName(word, document.uri.toString());
        }
        if (targetSymbol && targetSymbol.fileUri && !targetSymbol.fileUri.startsWith('system://')) {
            const targetUri = vscode.Uri.parse(targetSymbol.fileUri);
            const targetRange = new vscode.Range(targetSymbol.range.startLine, targetSymbol.range.startChar, targetSymbol.range.startLine, targetSymbol.range.endChar || 100);
            return new vscode.Location(targetUri, targetRange);
        }
        return undefined;
    }
}
exports.D7BasicDefinitionProvider = D7BasicDefinitionProvider;
//# sourceMappingURL=definition-provider.js.map