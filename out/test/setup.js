"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Module = require("module");
// Singleton mock vscode object
const mockVsCode = {
    Range: class Range {
        constructor(startLine, startChar, endLine, endChar) {
            this.start = { line: startLine, character: startChar };
            this.end = { line: endLine, character: endChar };
        }
    },
    Position: class Position {
        constructor(line, character) {
            this.line = line;
            this.character = character;
        }
    },
    Diagnostic: class Diagnostic {
        constructor(range, message, severity) {
            this.range = range;
            this.message = message;
            this.severity = severity;
        }
    },
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    },
    Uri: {
        file: (p) => ({
            toString: () => 'file:///' + p.replace(/\\/g, '/'),
            fsPath: p
        }),
        parse: (s) => {
            const decoded = decodeURIComponent(s);
            return {
                toString: () => s,
                fsPath: decoded.replace(/^file:\/\/\//, '').replace(/\//g, '\\')
            };
        }
    },
    Location: class Location {
        constructor(uri, range) {
            this.uri = uri;
            this.range = range;
        }
    },
    workspace: {
        textDocuments: [],
        getConfiguration: () => ({
            get: (key) => {
                if (key === 'sharedModulesPath')
                    return '';
                if (key === 'enableAutoSync')
                    return true;
                return undefined;
            }
        })
    }
};
// Override node's require to provide the mocked 'vscode' module
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
    if (id === 'vscode') {
        return mockVsCode;
    }
    return originalRequire.apply(this, arguments);
};
//# sourceMappingURL=setup.js.map