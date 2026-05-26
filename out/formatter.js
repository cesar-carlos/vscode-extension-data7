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
exports.D7BasicFormattingProvider = exports.CodeFormatter = void 0;
const vscode = __importStar(require("vscode"));
const keywordCasingMap = new Map([
    ['imports', 'Imports'], ['namespace', 'Namespace'], ['class', 'Class'],
    ['structure', 'Structure'], ['delegate', 'Delegate'], ['property', 'Property'],
    ['get', 'Get'], ['set', 'Set'], ['shared', 'Shared'], ['sub', 'Sub'],
    ['function', 'Function'], ['dim', 'Dim'], ['as', 'As'],
    ['if', 'If'], ['then', 'Then'], ['else', 'Else'], ['elseif', 'ElseIf'],
    ['end if', 'End If'], ['select case', 'Select Case'], ['case', 'Case'],
    ['end select', 'End Select'], ['for', 'For'], ['to', 'To'], ['step', 'Step'],
    ['next', 'Next'], ['each', 'Each'], ['in', 'In'], ['do', 'Do'], ['loop', 'Loop'],
    ['while', 'While'], ['until', 'Until'], ['try', 'Try'], ['catch', 'Catch'],
    ['finally', 'Finally'], ['end try', 'End Try'], ['return', 'Return'],
    ['new', 'New'], ['inherits', 'Inherits'], ['mybase', 'MyBase'], ['me', 'me'],
    ['null', 'NULL'], ['exit', 'Exit'], ['overrides', 'Overrides'],
    ['overridable', 'Overridable'], ['private', 'Private'], ['public', 'Public'],
    ['protected', 'Protected'], ['declare', 'Declare'], ['lib', 'Lib'],
    ['alias', 'Alias']
]);
class CodeFormatter {
    static formatKeywordsInLine(lineText) {
        // Separate comment first
        let comment = '';
        let code = lineText;
        const quoteIdx = lineText.indexOf("'");
        if (quoteIdx !== -1) {
            comment = lineText.substring(quoteIdx);
            code = lineText.substring(0, quoteIdx);
        }
        else {
            const remIdx = lineText.toLowerCase().indexOf('rem ');
            if (remIdx !== -1) {
                comment = lineText.substring(remIdx);
                code = lineText.substring(0, remIdx);
            }
        }
        let result = '';
        let i = 0;
        while (i < code.length) {
            const char = code[i];
            if (char === '"') {
                const endQuote = code.indexOf('"', i + 1);
                if (endQuote !== -1) {
                    result += code.substring(i, endQuote + 1);
                    i = endQuote + 1;
                }
                else {
                    result += code.substring(i);
                    break;
                }
            }
            else {
                if (/[a-zA-Z0-9_]/.test(char)) {
                    const start = i;
                    while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) {
                        i++;
                    }
                    const word = code.substring(start, i);
                    const lowerWord = word.toLowerCase();
                    const replacement = keywordCasingMap.get(lowerWord);
                    result += replacement !== undefined ? replacement : word;
                }
                else {
                    result += char;
                    i++;
                }
            }
        }
        // Replace multi-word keywords
        result = result
            .replace(/\bend\s+if\b/gi, 'End If')
            .replace(/\bselect\s+case\b/gi, 'Select Case')
            .replace(/\bend\s+select\b/gi, 'End Select')
            .replace(/\bend\s+try\b/gi, 'End Try')
            .replace(/\bend\s+sub\b/gi, 'End Sub')
            .replace(/\bend\s+function\b/gi, 'End Function')
            .replace(/\bend\s+property\b/gi, 'End Property')
            .replace(/\bend\s+class\b/gi, 'End Class')
            .replace(/\bend\s+structure\b/gi, 'End Structure')
            .replace(/\bend\s+namespace\b/gi, 'End Namespace');
        return result + comment;
    }
    static formatCode(text) {
        const lines = text.split(/\r?\n/);
        const formattedLines = [];
        let indentLevel = 0;
        const indentSize = 3;
        for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i];
            const trimmed = lineText.trim();
            if (!trimmed) {
                formattedLines.push('');
                continue;
            }
            let cleanLine = trimmed;
            const quoteIdx = trimmed.indexOf("'");
            if (quoteIdx !== -1) {
                cleanLine = trimmed.substring(0, quoteIdx).trim();
            }
            else {
                const remIdx = trimmed.toLowerCase().indexOf('rem ');
                if (remIdx !== -1) {
                    cleanLine = trimmed.substring(0, remIdx).trim();
                }
            }
            const lowerClean = cleanLine.toLowerCase();
            // Closing elements decrease indent before printing
            const isClosing = lowerClean === 'end namespace' ||
                lowerClean === 'end class' ||
                lowerClean === 'end structure' ||
                lowerClean === 'end property' ||
                lowerClean === 'end sub' ||
                lowerClean === 'end function' ||
                lowerClean === 'end if' ||
                lowerClean === 'next' ||
                lowerClean === 'loop' ||
                lowerClean === 'end try' ||
                lowerClean === 'end select' ||
                lowerClean === 'end get' ||
                lowerClean === 'end set' ||
                lowerClean === 'else' ||
                lowerClean.startsWith('elseif ') ||
                lowerClean.startsWith('elseif\t') ||
                lowerClean.startsWith('catch ') ||
                lowerClean.startsWith('catch\t') ||
                lowerClean === 'catch' ||
                lowerClean.startsWith('finally') ||
                lowerClean === 'finally';
            if (isClosing && indentLevel > 0) {
                indentLevel--;
            }
            const casedLine = this.formatKeywordsInLine(trimmed);
            const indentStr = ' '.repeat(indentLevel * indentSize);
            formattedLines.push(indentStr + casedLine);
            // Opening elements increase indent after printing
            const isOpening = lowerClean.startsWith('namespace ') ||
                /^(?:public\s+|private\s+|protected\s+)?class\s+/i.test(lowerClean) ||
                /^(?:public\s+|private\s+|protected\s+)?structure\s+/i.test(lowerClean) ||
                /^(?:public\s+|private\s+|protected\s+)?property\s+/i.test(lowerClean) ||
                (/^(?:public\s+|private\s+|protected\s+|shared\s+)*sub\s+/i.test(lowerClean) && !lowerClean.includes('declare sub') && !lowerClean.includes('delegate sub')) ||
                (/^(?:public\s+|private\s+|protected\s+|shared\s+)*function\s+/i.test(lowerClean) && !lowerClean.includes('declare function') && !lowerClean.includes('delegate function')) ||
                /^\s*if\s+.*\s+then$/i.test(lowerClean) ||
                lowerClean.startsWith('for ') ||
                lowerClean.startsWith('do ') ||
                lowerClean === 'do' ||
                lowerClean.startsWith('try') ||
                lowerClean.startsWith('select case ') ||
                lowerClean === 'get' ||
                lowerClean === 'set' ||
                lowerClean === 'else' ||
                lowerClean.startsWith('elseif ') ||
                lowerClean.startsWith('elseif\t') ||
                lowerClean.startsWith('catch ') ||
                lowerClean.startsWith('catch\t') ||
                lowerClean === 'catch' ||
                lowerClean.startsWith('finally') ||
                lowerClean === 'finally';
            if (isOpening) {
                indentLevel++;
            }
        }
        return formattedLines.join('\n');
    }
}
exports.CodeFormatter = CodeFormatter;
class D7BasicFormattingProvider {
    provideDocumentFormattingEdits(document, options, token) {
        const text = document.getText();
        const formatted = CodeFormatter.formatCode(text);
        const lastLine = document.lineCount - 1;
        const lastLineRange = document.lineAt(lastLine).range;
        const fullRange = new vscode.Range(new vscode.Position(0, 0), lastLineRange.end);
        return [vscode.TextEdit.replace(fullRange, formatted)];
    }
}
exports.D7BasicFormattingProvider = D7BasicFormattingProvider;
//# sourceMappingURL=formatter.js.map