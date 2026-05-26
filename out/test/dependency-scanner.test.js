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
require("./setup"); // MUST be first
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const dependency_scanner_1 = require("../dependency-scanner");
(0, node_test_1.test)('DependencyScanner - stripComments', () => {
    assert.strictEqual(dependency_scanner_1.DependencyScanner.stripComments("Dim a As String ' this is a comment"), "Dim a As String ");
    assert.strictEqual(dependency_scanner_1.DependencyScanner.stripComments("' whole line comment"), "");
    assert.strictEqual(dependency_scanner_1.DependencyScanner.stripComments("Rem whole line rem comment"), "");
    assert.strictEqual(dependency_scanner_1.DependencyScanner.stripComments("a = b"), "a = b");
});
(0, node_test_1.test)('DependencyScanner - isIgnoredNamespace', () => {
    assert.strictEqual(dependency_scanner_1.DependencyScanner.isIgnoredNamespace('system.xml'), true);
    assert.strictEqual(dependency_scanner_1.DependencyScanner.isIgnoredNamespace('vcl.forms'), true);
    assert.strictEqual(dependency_scanner_1.DependencyScanner.isIgnoredNamespace('collections'), true);
    // Net must not be ignored anymore
    assert.strictEqual(dependency_scanner_1.DependencyScanner.isIgnoredNamespace('net'), false);
    assert.strictEqual(dependency_scanner_1.DependencyScanner.isIgnoredNamespace('my_own_ns'), false);
});
(0, node_test_1.test)('DependencyScanner - detectReferencedModules', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'd7-dep-test-'));
    try {
        const fileContent = `
      Imports ModA
      Imports ModB.SubClass
      ' Imports ModC
      mod_external.SomeCall()
    `;
        fs.writeFileSync(path.join(tempDir, 'test.bas'), fileContent, 'utf-8');
        const availableSharedModules = new Map();
        availableSharedModules.set('moda', { name: 'ModA', filePath: 'some/path' });
        availableSharedModules.set('modb', { name: 'ModB', filePath: 'some/path' });
        availableSharedModules.set('mod_external', { name: 'mod_external', filePath: 'some/path' });
        const refs = dependency_scanner_1.DependencyScanner.detectReferencedModules(tempDir, availableSharedModules);
        assert.ok(refs.has('moda'));
        assert.ok(refs.has('modb'));
        assert.ok(refs.has('mod_external'));
    }
    finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=dependency-scanner.test.js.map