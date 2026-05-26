import Module = require('module');

// Singleton mock vscode object
const mockVsCode = {
  Range: class Range {
    start: { line: number; character: number };
    end: { line: number; character: number };
    constructor(startLine: number, startChar: number, endLine: number, endChar: number) {
      this.start = { line: startLine, character: startChar };
      this.end = { line: endLine, character: endChar };
    }
  },
  Position: class Position {
    line: number;
    character: number;
    constructor(line: number, character: number) {
      this.line = line;
      this.character = character;
    }
  },
  Diagnostic: class Diagnostic {
    range: any;
    message: string;
    severity: number;
    code?: string | number;
    constructor(range: any, message: string, severity: number) {
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
    file: (p: string) => ({
      toString: () => 'file:///' + p.replace(/\\/g, '/'),
      fsPath: p
    }),
    parse: (s: string) => {
      const decoded = decodeURIComponent(s);
      return {
        toString: () => s,
        fsPath: decoded.replace(/^file:\/\/\//, '').replace(/\//g, '\\')
      };
    }
  },
  Location: class Location {
    uri: any;
    range: any;
    constructor(uri: any, range: any) {
      this.uri = uri;
      this.range = range;
    }
  },
  workspace: {
    textDocuments: [] as any[],
    getConfiguration: () => ({
      get: (key: string) => {
        if (key === 'sharedModulesPath') return '';
        if (key === 'enableAutoSync') return true;
        return undefined;
      }
    })
  }
};

// Override node's require to provide the mocked 'vscode' module
const originalRequire = Module.prototype.require;
(Module.prototype as any).require = function (id: string) {
  if (id === 'vscode') {
    return mockVsCode;
  }
  return originalRequire.apply(this, arguments as any);
};
