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
exports.D7BasicCodeActionProvider = void 0;
const vscode = __importStar(require("vscode"));
class D7BasicCodeActionProvider {
    provideCodeActions(document, range, context, token) {
        const actions = [];
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.code === 'missing-import') {
                const match = diagnostic.message.match(/pertence ao módulo "([a-zA-Z0-9_.]+)"/);
                if (match) {
                    const namespaceToImport = match[1];
                    const action = new vscode.CodeAction(`Importar "${namespaceToImport}"`, vscode.CodeActionKind.QuickFix);
                    action.diagnostics = [diagnostic];
                    action.isPreferred = true;
                    const edit = new vscode.WorkspaceEdit();
                    let insertLine = 0;
                    for (let i = 0; i < document.lineCount; i++) {
                        const lineText = document.lineAt(i).text.trim();
                        if (lineText.toLowerCase().startsWith('imports ')) {
                            insertLine = i + 1;
                        }
                    }
                    edit.insert(document.uri, new vscode.Position(insertLine, 0), `Imports ${namespaceToImport}\r\n`);
                    action.edit = edit;
                    actions.push(action);
                }
            }
        }
        return actions;
    }
}
exports.D7BasicCodeActionProvider = D7BasicCodeActionProvider;
//# sourceMappingURL=code-actions.js.map